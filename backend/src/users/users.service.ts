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
    
    // 如果更新了 organizationId，需要同时更新 organization 关系
    if (userData.organizationId !== undefined && userData.organizationId !== user.organizationId) {
      const organization = await this.organizationsService.findOne(userData.organizationId);
      if (organization) {
        user.organization = organization;
        user.organizationId = userData.organizationId;
      }
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
    if (!file || !file.buffer) {
      throw new Error('未上传文件或文件内容为空');
    }

    let workbook;
    
    // 检查是否为 CSV 文件
    const isCsv = file.mimetype === 'text/csv' ||
                  file.originalname.toLowerCase().endsWith('.csv') ||
                  file.mimetype === 'application/vnd.ms-excel'; // 有些系统将 CSV 识别为这个

    if (isCsv) {
       // 使用增强的 CSV 解析逻辑
       workbook = this.tryParseCsvWithEncodings(file.buffer);
    } else {
       // 对于标准的 xlsx 文件，通常不需要手动处理编码
       // 除非 jschardet 强力认为是文本且像 CSV，否则交给 xlsx 库直接处理 buffer
       workbook = xlsx.read(file.buffer, { type: 'buffer' });
    }

    if (!workbook.SheetNames.length) {
      throw new Error('Excel文件没有任何工作表');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const usersData = xlsx.utils.sheet_to_json(worksheet) as any[];

    if (!usersData || usersData.length === 0) {
      throw new Error('文件内容为空或无法识别列头');
    }

    const resultData: any[] = [];
    const roleMap: Record<string, string> = {
      '高层': '高层领导者',
      '中层': '中层管理者',
      '基层': '基层管理者'
    };
    let hasError = false;

    // 第一遍：校验整个文件
    for (const row of usersData) {
      if (!row || typeof row !== 'object') continue;
      
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

      const companyName = getVal(['公司'])?.toString().trim();
      const name = getVal(['姓名'])?.toString().trim();
      const level = getVal(['层级'])?.toString().trim();
      const email = getVal(['邮箱'])?.toString().trim();
      
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
      if (!row || typeof row !== 'object') continue;
      
      // 再次使用 getVal 逻辑确保能取到值
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined) return row[k];
          const foundKey = Object.keys(row).find(rk => rk.trim().replace(/^\ufeff/, '') === k);
          if (foundKey) return row[foundKey];
        }
        return undefined;
      };

      const companyName = getVal(['公司'])?.toString().trim();
      const name = getVal(['姓名'])?.toString().trim();
      const level = getVal(['层级'])?.toString().trim();
      const jobTitle = getVal(['职位'])?.toString().trim() || '';
      const email = getVal(['邮箱'])?.toString().trim();
      const phone = getVal(['手机号', '电话'])?.toString().trim() || ''; // 支持 '电话' 列名

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
          // 始终创建新组织，允许同名组织存在（即使数据库中已有同名组织）
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
           user.organizationId = organization.id; // 显式设置organizationId
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
          '错误信息': error?.message || '系统处理错误'
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

  /**
   * 尝试使用多种编码解析 CSV 文件
   * 优先尝试 UTF-8 和 GBK/GB18030，通过检查关键列头来判断是否解析正确
   */
  private tryParseCsvWithEncodings(buffer: Buffer): xlsx.WorkBook {
    // 优先尝试的编码列表
    const encodingsToTry = ['UTF-8', 'GBK', 'GB18030'];
    
    // 加入 jschardet 检测到的编码作为备选
    const detection = jschardet.detect(buffer);
    console.log(`Initial encoding detection: ${detection.encoding} (Confidence: ${detection.confidence})`);
    
    if (detection.encoding) {
      let detected = detection.encoding.toUpperCase();
      if (detected === 'GB2312') detected = 'GBK';
      if (!encodingsToTry.includes(detected)) {
        encodingsToTry.push(detected);
      }
    }

    for (const encoding of encodingsToTry) {
      try {
        // 使用指定编码解码 buffer
        const content = iconv.decode(buffer, encoding);
        // xlsx.read type='string' 用于读取 CSV 文本内容
        const wb = xlsx.read(content, { type: 'string' });
        
        if (wb.SheetNames.length > 0) {
          const sheet = wb.Sheets[wb.SheetNames[0]];
          // 读取第一行作为表头检查
          const headers = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0] as any[];
          
          if (headers && Array.isArray(headers)) {
            const headerStr = headers.map(h => String(h).trim()).join(',');
            // 检查是否包含关键列名 (只要包含其中两个关键字段即认为解析正确)
            // 允许 key 带有 BOM 或空格
            const hasName = headerStr.includes('姓名');
            const hasEmail = headerStr.includes('邮箱');
            const hasCompany = headerStr.includes('公司');
            
            if ((hasName && hasEmail) || (hasName && hasCompany) || (hasEmail && hasCompany)) {
              console.log(`Successfully parsed CSV with encoding: ${encoding}`);
              return wb;
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to parse CSV with encoding ${encoding}`, e);
      }
    }

    // 如果所有尝试都失败，回退到默认处理（使用检测到的编码或 UTF-8）
    console.warn('All encoding attempts failed or headers not found. Falling back to detection.');

    // 最后的尝试：直接让 xlsx 处理 buffer，以防是 binary file (xlsx/xls) 或者是 xlsx 能自动识别的情况
    try {
      const wb = xlsx.read(buffer, { type: 'buffer' });
      if (wb.SheetNames.length > 0) {
        // 同样检查一下是否有正确的内容，防止读出一堆乱码 sheet
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const headers = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0] as any[];
        if (headers && Array.isArray(headers)) {
           const headerStr = headers.map(h => String(h).trim()).join(',');
           if (headerStr.includes('姓名') || headerStr.includes('邮箱')) {
             console.log('Successfully parsed with generic xlsx read');
             return wb;
           }
        }
      }
    } catch(e) {
      // ignore
    }

    const finalEncoding = detection.encoding || 'UTF-8';
    const content = iconv.decode(buffer, finalEncoding);
    return xlsx.read(content, { type: 'string' });
  }
}
