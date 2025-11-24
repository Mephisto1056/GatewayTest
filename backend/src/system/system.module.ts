import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { UsersModule } from '../users/users.module';
import { EvaluationsModule } from '../evaluations/evaluations.module';
import { QuestionnairesModule } from '../questionnaires/questionnaires.module';

@Module({
  imports: [
    UsersModule,
    EvaluationsModule,
    QuestionnairesModule,
  ],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
