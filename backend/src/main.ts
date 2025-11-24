import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseHealthService } from './database/database-health.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('🚀 正在启动应用...');
    
    const app = await NestFactory.create(AppModule);
    
    // 设置全局前缀
    app.setGlobalPrefix('api');
    
    // 启用CORS
    app.enableCors({
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    });
    
    // 执行数据库健康检查
    logger.log('🏥 开始数据库健康检查...');
    const dbHealthService = app.get(DatabaseHealthService);
    const healthCheck = await dbHealthService.performFullHealthCheck();
    
    if (!healthCheck.connectionOk) {
      logger.error('❌ 数据库连接失败，应用无法启动');
      logger.error('💡 建议检查:');
      logger.error('   - PostgreSQL服务是否运行');
      logger.error('   - 数据库配置是否正确');
      logger.error('   - 网络连接是否正常');
      process.exit(1);
    }
    
    if (!healthCheck.tablesOk) {
      logger.warn('⚠️  数据库表结构不完整');
      logger.warn(`   缺少表: ${healthCheck.missingTables.join(', ')}`);
      logger.warn('💡 建议运行数据库迁移或检查TypeORM配置');
    }
    
    // 检查数据
    const emptyTables = Object.entries(healthCheck.tableDataCounts)
      .filter(([_, count]) => count === 0)
      .map(([tableName, _]) => tableName);
    
    if (emptyTables.length > 0) {
      logger.warn('⚠️  以下表没有数据:');
      emptyTables.forEach(tableName => {
        logger.warn(`   - ${tableName}`);
      });
      logger.warn('💡 建议运行数据导入脚本:');
      logger.warn('   cd backend && npx ts-node src/scripts/import-all-questions.ts');
    }
    
    // 显示建议
    if (healthCheck.recommendations.length > 0) {
      logger.warn('💡 建议执行以下操作:');
      healthCheck.recommendations.forEach(rec => {
        logger.warn(`   - ${rec}`);
      });
    }
    
    await app.listen(process.env.PORT ?? 3000);
    
    logger.log('✅ 应用启动成功!');
    logger.log('🌐 服务地址: http://localhost:3000');
    logger.log('📋 API文档: http://localhost:3000/api');
    logger.log('🎯 前端地址: http://localhost:5173');
    
  } catch (error) {
    logger.error('❌ 应用启动失败:', error.message);
    process.exit(1);
  }
}

bootstrap();
