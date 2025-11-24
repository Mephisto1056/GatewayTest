import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { QuestionnairesService } from './questionnaires.service';
import { QuestionSelfdirected } from './entities/question-selfdirected.entity';
import { QuestionHighleveltest } from './entities/question-highleveltest.entity';
import { QuestionMediumleveltest } from './entities/question-mediumleveltest.entity';
import { QuestionLowleveltest } from './entities/question-lowleveltest.entity';

@Controller('questionnaires')
export class QuestionnairesController {
  constructor(private readonly questionnairesService: QuestionnairesService) {}

  @Get('selfdirected')
  findAllSelfdirectedQuestions(): Promise<QuestionSelfdirected[]> {
    return this.questionnairesService.findAllSelfdirectedQuestions();
  }

  @Get('selfdirected/by-dimension')
  findSelfdirectedQuestionsByDimension(@Query('dimension') dimension: string): Promise<QuestionSelfdirected[]> {
    return this.questionnairesService.findSelfdirectedQuestionsByDimension(dimension);
  }

  @Get('selfdirected/by-code/:code')
  findSelfdirectedQuestionByCode(@Param('code') questionCode: string): Promise<QuestionSelfdirected | null> {
    return this.questionnairesService.findQuestionByCode(questionCode);
  }

  @Post('selfdirected')
  createQuestion(@Body() questionData: Partial<QuestionSelfdirected>): Promise<QuestionSelfdirected> {
    return this.questionnairesService.createQuestion(questionData);
  }

  @Put('selfdirected/:id')
  updateQuestion(
    @Param('id') id: string, 
    @Body() questionData: Partial<QuestionSelfdirected>
  ): Promise<QuestionSelfdirected> {
    return this.questionnairesService.updateQuestion(+id, questionData);
  }

  @Delete('selfdirected/:id')
  deleteQuestion(@Param('id') id: string): Promise<void> {
    return this.questionnairesService.deleteQuestion(+id);
  }

  // 获取高层问题
  @Get('highlevel')
  findAllHighlevelQuestions(): Promise<QuestionHighleveltest[]> {
    return this.questionnairesService.findAllHighlevelQuestions();
  }

  // 获取中层问题
  @Get('mediumlevel')
  findAllMediumlevelQuestions(): Promise<QuestionMediumleveltest[]> {
    return this.questionnairesService.findAllMediumlevelQuestions();
  }

  // 获取基层问题
  @Get('lowlevel')
  findAllLowlevelQuestions(): Promise<QuestionLowleveltest[]> {
    return this.questionnairesService.findAllLowlevelQuestions();
  }

  // 根据用户角色获取完整问卷
  @Get('by-role/:role')
  getQuestionnaireByUserRole(@Param('role') userRole: string): Promise<{
    selfdirected: QuestionSelfdirected[];
    roleSpecific: QuestionHighleveltest[] | QuestionMediumleveltest[] | QuestionLowleveltest[];
  }> {
    return this.questionnairesService.getQuestionnaireByUserRole(userRole);
  }

  // 根据问题编号获取问题（支持所有类型）
  @Get('question/:code')
  async findAnyQuestionByCode(@Param('code') questionCode: string): Promise<any> {
    // 尝试从所有表中查找问题
    const selfdirected = await this.questionnairesService.findSelfdirectedQuestionByCode(questionCode);
    if (selfdirected) return { type: 'selfdirected', question: selfdirected };

    const highlevel = await this.questionnairesService.findHighlevelQuestionByCode(questionCode);
    if (highlevel) return { type: 'highlevel', question: highlevel };

    const mediumlevel = await this.questionnairesService.findMediumlevelQuestionByCode(questionCode);
    if (mediumlevel) return { type: 'mediumlevel', question: mediumlevel };

    const lowlevel = await this.questionnairesService.findLowlevelQuestionByCode(questionCode);
    if (lowlevel) return { type: 'lowlevel', question: lowlevel };

    return null;
  }
}
