import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluationResponse } from './entities/evaluation-response.entity';
import { EvaluationParticipant } from './entities/evaluation-participant.entity';

import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { ScoringService } from './scoring.service';
import { QuestionnairesModule } from '../questionnaires/questionnaires.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evaluation, EvaluationResponse, EvaluationParticipant]),
    QuestionnairesModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [EvaluationsController],
  providers: [EvaluationsService, ScoringService],
  exports: [EvaluationsService, ScoringService],
})
export class EvaluationsModule {}
