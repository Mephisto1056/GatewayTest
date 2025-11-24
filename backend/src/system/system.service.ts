import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { UsersService } from '../users/users.service';
import { EvaluationsService } from '../evaluations/evaluations.service';
import { QuestionnairesService } from '../questionnaires/questionnaires.service';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly evaluationsService: EvaluationsService,
    private readonly questionnairesService: QuestionnairesService,
  ) {}

  async getDashboardStats(): Promise<any> {
    const totalUsers = await this.usersService.count();
    const totalEvaluations = await this.evaluationsService.count();
    const completedEvaluations = await this.evaluationsService.countCompleted();
    const totalQuestions = await this.questionnairesService.countTotal();
    
    const recentActivities = await this.getRecentActivities();

    return {
      totalUsers,
      totalEvaluations,
      completedEvaluations,
      totalQuestions,
      recentActivities
    };
  }

  private async getRecentActivities(): Promise<any[]> {
    // Get latest 5 evaluations
    const evaluations = await this.evaluationsService.findAll();
    const latestEvaluations = evaluations.slice(0, 5);

    return latestEvaluations.map(evaluation => ({
      id: evaluation.id,
      text: `用户 ${evaluation.user?.name || 'Unknown'} 创建了新的评估`,
      time: evaluation.createdAt,
      iconName: 'evaluations'
    }));
  }

  getLogs(): string[] {
    // 在实际应用中，这里应该从日志文件或日志服务中读取
    return ['Log entry 1', 'Log entry 2'];
  }

  async backupDatabase(): Promise<string> {
    this.logger.log('Starting database backup...');
    // 注意：这只是一个示例，实际应用中需要更健壮的备份策略
    // 并且需要确保 pg_dump 命令在系统路径中可用
    return new Promise((resolve, reject) => {
      exec('pg_dump -U postgres -d leadership_system > backup.sql', (error, stdout, stderr) => {
        if (error) {
          this.logger.error('Database backup failed:', stderr);
          reject('Backup failed');
        }
        this.logger.log('Database backup successful');
        resolve('Backup successful');
      });
    });
  }
}
