import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      this.logger.log('🔍 检查数据库连接...');
      
      // 检查数据库连接
      if (!this.dataSource.isInitialized) {
        this.logger.error('❌ 数据库连接未初始化');
        return false;
      }

      // 执行简单查询测试连接
      await this.dataSource.query('SELECT 1');
      this.logger.log('✅ 数据库连接正常');
      return true;
    } catch (error) {
      this.logger.error('❌ 数据库连接失败:', error.message);
      return false;
    }
  }

  async checkRequiredTables(): Promise<{ success: boolean; missingTables: string[] }> {
    try {
      this.logger.log('🔍 检查数据库表结构...');
      
      const requiredTables = [
        'users',
        'question_selfdirected',
        'question_highleveltest',
        'question_mediumleveltest',
        'question_lowleveltest',
        'evaluations',
        'evaluation_responses',
        'reports'
      ];

      const missingTables: string[] = [];

      for (const tableName of requiredTables) {
        try {
          const result = await this.dataSource.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = $1
            );
          `, [tableName]);

          if (!result[0].exists) {
            missingTables.push(tableName);
          }
        } catch (error) {
          this.logger.warn(`⚠️  检查表 ${tableName} 时出错: ${error.message}`);
          missingTables.push(tableName);
        }
      }

      if (missingTables.length === 0) {
        this.logger.log('✅ 所有必需的数据库表都存在');
        return { success: true, missingTables: [] };
      } else {
        this.logger.warn(`⚠️  缺少以下数据库表: ${missingTables.join(', ')}`);
        return { success: false, missingTables };
      }
    } catch (error) {
      this.logger.error('❌ 检查数据库表时出错:', error.message);
      return { success: false, missingTables: [] };
    }
  }

  async checkTableData(): Promise<{ [tableName: string]: number }> {
    try {
      this.logger.log('🔍 检查数据库表数据...');
      
      const dataTables = [
        'question_selfdirected',
        'question_highleveltest',
        'question_mediumleveltest',
        'question_lowleveltest'
      ];

      const tableDataCounts: { [tableName: string]: number } = {};

      for (const tableName of dataTables) {
        try {
          const result = await this.dataSource.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const count = parseInt(result[0].count);
          tableDataCounts[tableName] = count;
          
          if (count === 0) {
            this.logger.warn(`⚠️  表 ${tableName} 没有数据`);
          } else {
            this.logger.log(`✅ 表 ${tableName} 有 ${count} 条记录`);
          }
        } catch (error) {
          this.logger.warn(`⚠️  检查表 ${tableName} 数据时出错: ${error.message}`);
          tableDataCounts[tableName] = -1;
        }
      }

      return tableDataCounts;
    } catch (error) {
      this.logger.error('❌ 检查表数据时出错:', error.message);
      return {};
    }
  }

  async performFullHealthCheck(): Promise<{
    connectionOk: boolean;
    tablesOk: boolean;
    missingTables: string[];
    tableDataCounts: { [tableName: string]: number };
    recommendations: string[];
  }> {
    this.logger.log('🏥 开始数据库健康检查...');
    
    const connectionOk = await this.checkDatabaseConnection();
    const { success: tablesOk, missingTables } = await this.checkRequiredTables();
    const tableDataCounts = await this.checkTableData();
    
    const recommendations: string[] = [];
    
    if (!connectionOk) {
      recommendations.push('检查数据库服务是否运行');
      recommendations.push('验证数据库连接配置');
    }
    
    if (!tablesOk) {
      recommendations.push('运行数据库迁移创建缺失的表');
      recommendations.push('检查TypeORM配置中的synchronize设置');
    }
    
    // 检查是否需要导入数据
    const emptyTables = Object.entries(tableDataCounts)
      .filter(([_, count]) => count === 0)
      .map(([tableName, _]) => tableName);
    
    if (emptyTables.length > 0) {
      recommendations.push(`导入问题数据到空表: ${emptyTables.join(', ')}`);
      recommendations.push('运行 npm run import-questions 导入测试数据');
    }
    
    this.logger.log('🏥 数据库健康检查完成');
    
    return {
      connectionOk,
      tablesOk,
      missingTables,
      tableDataCounts,
      recommendations
    };
  }
}