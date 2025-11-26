import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import * as bcrypt from 'bcrypt';
import * as xlsx from 'xlsx';
import * as crypto from 'crypto';
import * as jschardet from 'jschardet';
import * as iconv from 'iconv-lite';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private organizationsService: OrganizationsService,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['organization'],
    });
  }

  findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.password')
      .getOne();
  }

  async create(userData: Partial<User>): Promise<User> {
    if (userData.password) {
      const salt = await bcrypt.genSalt();
      userData.password = await bcrypt.hash(userData.password, salt);
    }
    const user = this.usersRepository.create({
      ...userData,
      organizationId: userData.organizationId || 1, // 默认组织ID
      role: userData.role || 'user', // 默认角色
    });
    return this.usersRepository.save(user);
  }

  async update(id: number, userData: Partial<User>): Promise<User> {
    if (userData.password) {
      const salt = await bcrypt.genSalt();
      userData.password = await bcrypt.hash(userData.password, salt);
    }
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    this.usersRepository.merge(user, userData);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id });
    // 仅保护管理员账号和特定邮箱的管理员，不限制其他用户的删除（例如 ID 为 2 的普通用户可以被删除）
    if (user && (user.role === 'admin' || user.email === 'admin@gateway.com')) {
        throw new Error('无法删除管理员账号');
    }

    try {
        await this.usersRepository.delete(id);
    } catch (error) {
        console.error('Error deleting user:', error);
        if (error.code === '23503') { // PostgreSQL foreign key violation code
            throw new Error('无法删除用户：该用户存在关联数据（如评估记录），请先删除相关数据或联系管理员。');
        }
        throw error;
    }
  }

  async batchRemove(ids: number[]): Promise<{ successCount: number; failCount: number; errors: string[] }> {
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await this.remove(id);
        successCount++;
      } catch (error: any) {
        failCount++;
        errors.push(`ID ${id}: ${error.message}`);
      }
    }

    return { successCount, failCount, errors };
  }

  async count(): Promise<number> {
    return this.usersRepository.count();
  }

  async batchImport(file: Express.Multer.File): Promise<Buffer> {
    // 1. 检测文件编码
    const detection = jschardet.detect(file.buffer);
    let encoding = detection.encoding || 'utf-8';
    
    // 规范化编码名称
    if (encoding.toUpperCase() === 'GB2312') {
      encoding = 'GBK';
    }

    console.log(`User import file encoding detected: ${encoding} (Confidence: ${detection.confidence})`);

    let workbook;
    // 如果是 CSV 文件 (通常 mimetype 是 text/csv 或 application/vnd.ms-excel 但内容是文本)，或者检测出来是纯文本编码
    // 我们尝试转换编码。为了保险，如果检测到是 GBK/GB2312，手动转码
    if (encoding.toUpperCase() === 'GBK' || file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
       try {
          const content = iconv.decode(file.buffer, encoding);
          workbook = xlsx.read(content, { type: 'string' });
       } catch (e) {
          console.warn('Failed to decode with iconv, falling back to default xlsx read', e);
          workbook = xlsx.read(file.buffer, { type: 'buffer', codepage: 65001 });
       }
    } else {
       // 对于标准的 xlsx 文件，通常不需要手动处理编码
       workbook = xlsx.read(file.buffer, { type: 'buffer' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const usersData = xlsx.utils.sheet_to_json(worksheet) as any[];

    const resultData: any[] = [];
    const roleMap: Record<string, string> = {
      '高层': '高层领导者',
      '中层': '中层管理者',
      '基层': '基层管理者'
    };
    let hasError = false;

    // 第一遍：校验整个文件
    for (const row of usersData) {
      // 处理 key 可能带有 BOM 或空格的情况
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined) return row[k];
          // 尝试去除 key 的 BOM 和空格
          const foundKey = Object.keys(row).find(rk => rk.trim().replace(/^\ufeff/, '') === k);
          if (foundKey) return row[foundKey];
        }
        return undefined;
      };

      const companyName = getVal(['公司']);
      const name = getVal(['姓名']);
      const level = getVal(['层级']);
      const email = getVal(['邮箱']);
      
      const rowResult: any = { ...row };
      const errors: string[] = [];

      // 校验必填字段
      if (!companyName || !name || !email) {
        errors.push('缺少必填字段(公司/姓名/邮箱)');
      }

      // 校验层级
      if (level) {
        if (!roleMap[level]) {
          errors.push(`无效的层级: ${level}。请填写: 高层, 中层, 或 基层`);
        }
      } else {
         // 如果没有填写层级，暂时不报错，后续流程会尝试用职位推断，或者默认为基层
      }

      if (errors.length > 0) {
        hasError = true;
        rowResult['导入结果'] = '失败';
        rowResult['错误信息'] = errors.join('; ');
      } else {
        rowResult['导入结果'] = '验证通过';
      }
      resultData.push(rowResult);
    }

    // 如果有错误，直接返回包含错误信息的 Excel (XLSX)，避免 CSV 乱码问题
    if (hasError) {
       const newSheet = xlsx.utils.json_to_sheet(resultData);
       const newWorkbook = xlsx.utils.book_new();
       xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'ValidationErrors');
       return xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
    }

    // 第二遍：处理数据并保存 (只有当所有校验通过时才执行)
    // 重置 resultData 以便填充最终结果（包含密码）
    const finalResultData: any[] = [];
    // 维护一个本次导入的组织缓存，确保同一批次中相同的公司名使用同一个新创建的组织
    const createdOrgsInThisBatch = new Map<string, any>();

    for (const row of usersData) {
      // 再次使用 getVal 逻辑确保能取到值
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined) return row[k];
          const foundKey = Object.keys(row).find(rk => rk.trim().replace(/^\ufeff/, '') === k);
          if (foundKey) return row[foundKey];
        }
        return undefined;
      };

      const companyName = getVal(['公司']);
      const name = getVal(['姓名']);
      const level = getVal(['层级']);
      const jobTitle = getVal(['职位']) || '';
      const email = getVal(['邮箱']);
      const phone = getVal(['手机号', '电话']) || ''; // 支持 '电话' 列名

      let finalRole = '基层管理者'; // 默认
      if (level && roleMap[level]) {
        finalRole = roleMap[level];
      } else {
        finalRole = this.mapRole(jobTitle);
      }

      try {
        // 1. 创建组织 (每次导入都创建新的组织，同一次导入中相同的公司名共用一个)
        let organization = createdOrgsInThisBatch.get(companyName);
        if (!organization) {
          organization = await this.organizationsService.create(companyName);
          createdOrgsInThisBatch.set(companyName, organization);
        }

        // 2. 生成随机密码 (8位字母数字)
        const rawPassword = crypto.randomBytes(4).toString('hex');
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        // 3. 准备用户数据
        let user = await this.findOneByEmail(email);
        if (!user) {
          user = this.usersRepository.create({
            name,
            email,
            phone,
            role: finalRole,
            position: jobTitle,
            company: companyName,
            organization,
            password: hashedPassword,
          });
        } else {
           // 更新用户
           user.organization = organization;
           user.password = hashedPassword;
           user.role = finalRole;
           user.phone = phone || user.phone;
           user.position = jobTitle || user.position;
           user.company = companyName || user.company;
        }

        // 立即保存用户，以便捕获单个用户的保存错误（如重复数据等），并防止 CSV 内重复邮箱导致的问题
        await this.usersRepository.save(user);

        finalResultData.push({
          ...row,
          '初始密码': rawPassword,
          '系统角色': user.role,
          '导入结果': '成功'
        });
      } catch (error: any) {
        console.error(`Error importing user ${name} (${email}):`, error);
        finalResultData.push({
          ...row,
          '导入结果': '失败',
          '错误信息': error.message || '系统处理错误'
        });
      }
    }

    // 4. 生成包含密码和结果的新 Excel (XLSX)，避免乱码
    const newSheet = xlsx.utils.json_to_sheet(finalResultData);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'UsersWithPassword');
    
    return xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private mapRole(jobTitle: string): string {
    // 简单的关键词映射，实际可能需要更复杂的逻辑或字典表
    if (jobTitle.includes('总经理') || jobTitle.includes('CEO') || jobTitle.includes('总裁')) return '高层领导者';
    if (jobTitle.includes('总监') || jobTitle.includes('经理')) return '中层管理者';
    if (jobTitle.includes('主管') || jobTitle.includes('组长')) return '基层管理者';
    return '基层管理者'; // 默认
  }
}
