import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { EvaluationResponse } from '../evaluations/entities/evaluation-response.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportGeneratorService } from './report-generator.service';
import { EvaluationsModule } from '../evaluations/evaluations.module';
import { QuestionnairesModule } from '../questionnaires/questionnaires.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, EvaluationResponse, Evaluation]),
    EvaluationsModule,
    QuestionnairesModule,
    UsersModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportGeneratorService],
  exports: [ReportsService, ReportGeneratorService],
})
export class ReportsModule { }
