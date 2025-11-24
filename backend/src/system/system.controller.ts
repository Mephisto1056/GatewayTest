import { Controller, Get, Post } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('stats')
  getDashboardStats(): Promise<any> {
    return this.systemService.getDashboardStats();
  }

  @Get('logs')
  getLogs(): string[] {
    return this.systemService.getLogs();
  }

  @Post('backup')
  backupDatabase(): Promise<string> {
    return this.systemService.backupDatabase();
  }
}
