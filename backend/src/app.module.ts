import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { QuestionnairesModule } from './questionnaires/questionnaires.module';
import { QuestionSelfdirected } from './questionnaires/entities/question-selfdirected.entity';
import { QuestionHighleveltest } from './questionnaires/entities/question-highleveltest.entity';
import { QuestionLowleveltest } from './questionnaires/entities/question-lowleveltest.entity';
import { QuestionMediumleveltest } from './questionnaires/entities/question-mediumleveltest.entity';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { Evaluation } from './evaluations/entities/evaluation.entity';
import { EvaluationResponse } from './evaluations/entities/evaluation-response.entity';
import { EvaluationParticipant } from './evaluations/entities/evaluation-participant.entity';
import { ReportsModule } from './reports/reports.module';
import { Report } from './reports/entities/report.entity';
import { SystemModule } from './system/system.module';
import { DatabaseHealthService } from './database/database-health.service';
import { AuthModule } from './auth';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { Organization } from './organizations/entities/organization.entity';

@Module({
  imports: [
    OrganizationsModule,
    NotificationsModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true, // 使 ConfigModule 在全局可用
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    QuestionnairesModule,
    EvaluationsModule,
    ReportsModule,
    SystemModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseHealthService],
})
export class AppModule {}
