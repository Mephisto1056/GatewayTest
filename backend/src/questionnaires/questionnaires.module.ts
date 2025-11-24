import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionSelfdirected } from './entities/question-selfdirected.entity';
import { QuestionHighleveltest } from './entities/question-highleveltest.entity';
import { QuestionLowleveltest } from './entities/question-lowleveltest.entity';
import { QuestionMediumleveltest } from './entities/question-mediumleveltest.entity';

import { QuestionnairesController } from './questionnaires.controller';
import { QuestionnairesService } from './questionnaires.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionSelfdirected,
      QuestionHighleveltest,
      QuestionLowleveltest,
      QuestionMediumleveltest,
    ]),
  ],
  controllers: [QuestionnairesController],
  providers: [QuestionnairesService],
  exports: [QuestionnairesService],
})
export class QuestionnairesModule {}
