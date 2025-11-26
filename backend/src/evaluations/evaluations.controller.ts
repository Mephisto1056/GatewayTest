import { Controller, Post, Body, Get, Param, Query, UseGuards, Request, Delete } from '@nestjs/common';
import { EvaluationsService, QuestionnaireSubmission } from './evaluations.service';
import { Evaluation } from './entities/evaluation.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EvaluationResponse } from './entities/evaluation-response.entity';
import { PublishBatchDto } from './dto/publish-batch.dto';
import { NominateEvaluatorsDto } from './dto/nominate-evaluators.dto';

@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get()
  findAll(): Promise<Evaluation[]> {
    return this.evaluationsService.findAll();
  }

  @Post('publish')
  publish(@Body() evaluation: Partial<Evaluation>): Promise<Evaluation> {
    return this.evaluationsService.publish(evaluation);
  }

  @Post('publish-batch')
  publishBatch(@Body() publishBatchDto: PublishBatchDto): Promise<Evaluation[]> {
    return this.evaluationsService.publishBatch(publishBatchDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('nominate')
  async nominateEvaluators(@Body() dto: NominateEvaluatorsDto, @Request() req) {
    const userId = req.user.userId;
    return this.evaluationsService.nominateEvaluators(userId, dto);
  }

  @Post('responses')
  submitResponse(@Body() response: Partial<EvaluationResponse>): Promise<EvaluationResponse> {
    return this.evaluationsService.submitResponse(response);
  }

  // 新的批量提交问卷接口
  @UseGuards(JwtAuthGuard)
  @Post('submit-questionnaire')
  async submitQuestionnaire(@Body() submission: QuestionnaireSubmission, @Request() req) {
    const respondentId = req.user.userId; // 从JWT payload中获取用户ID
    return this.evaluationsService.submitQuestionnaire(submission, respondentId);
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string): Promise<any> {
    return this.evaluationsService.getProgress(+id);
  }

  // 获取评估的所有回答
  @Get(':id/responses')
  getEvaluationResponses(@Param('id') id: string): Promise<EvaluationResponse[]> {
    return this.evaluationsService.getEvaluationResponses(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('organization/:orgId')
  async deleteByOrganization(@Param('orgId') orgId: string) {
    return this.evaluationsService.deleteByOrganization(+orgId);
  }

  // 计算360度评估结果
  @Post(':id/calculate-360')
  async calculate360DegreeEvaluation(@Param('id') id: string) {
    return this.evaluationsService.calculate360DegreeEvaluation(+id);
  }

  // 获取用户评估历史
  @Get('user/:userId/history')
  getUserEvaluationHistory(@Param('userId') userId: string): Promise<Evaluation[]> {
    return this.evaluationsService.getUserEvaluationHistory(+userId);
  }

  // 获取我的评估任务
  @UseGuards(JwtAuthGuard)
  @Get('my-tasks')
  getMyTasks(@Request() req, @Query('status') status?: string) {
    const userId = req.user.userId;
    return this.evaluationsService.findMyTasks(userId, status);
  }
}
