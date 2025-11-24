import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Evaluation } from './entities/evaluation.entity';
import { PublishBatchDto } from './dto/publish-batch.dto';
import { EvaluationResponse } from './entities/evaluation-response.entity';
import { ScoringService, UserEvaluationResult } from './scoring.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EvaluationParticipant } from './entities/evaluation-participant.entity';
import { NominateEvaluatorsDto } from './dto/nominate-evaluators.dto';

export interface QuestionnaireSubmission {
  evaluationId: number;
  // respondentId is now passed from the JWT token, so it's optional here
  respondentId?: number;
  relationship: string;
  responses: Array<{
    questionCode: string;
    score?: number;
    openText?: string;
  }>;
}

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    @InjectRepository(EvaluationResponse)
    private evaluationResponsesRepository: Repository<EvaluationResponse>,
    @InjectRepository(EvaluationParticipant)
    private participantsRepository: Repository<EvaluationParticipant>,
    private scoringService: ScoringService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {}

  findAll(): Promise<Evaluation[]> {
    return this.evaluationsRepository.find({
      relations: ['user', 'responses', 'participants', 'participants.participant'],
      order: { createdAt: 'DESC' }
    });
  }

  async count(): Promise<number> {
    return this.evaluationsRepository.count();
  }

  async countCompleted(): Promise<number> {
    // 这里定义"完成"的标准。如果 evaluation 有 status 字段最好，没有的话可能需要根据 responses 判断
    // 假设 Evaluation 实体有 status 字段，或者我们简单地根据是否有关闭时间等来判断
    // 暂时先返回总数，或者你可以添加更复杂的逻辑
    return this.evaluationsRepository.count({
      where: { status: 'completed' as any }
    });
  }

  publish(evaluation: Partial<Evaluation>): Promise<Evaluation> {
    const newEvaluation = this.evaluationsRepository.create(evaluation);
    return this.evaluationsRepository.save(newEvaluation);
  }

  async publishBatch(publishBatchDto: PublishBatchDto): Promise<Evaluation[]> {
    const { userIds, ...evaluationData } = publishBatchDto;
    const evaluationsToCreate: Partial<Evaluation>[] = userIds.map(userId => ({
      ...evaluationData,
      userId,
    }));

    const savedEvaluations = await this.evaluationsRepository.save(evaluationsToCreate);

    // 为每个评估创建参与者
    const participantsToCreate: Partial<EvaluationParticipant>[] = [];

    for (const evaluation of savedEvaluations) {
      // 1. 添加自评参与者
      participantsToCreate.push({
        evaluationId: evaluation.id,
        participantId: evaluation.userId,
        relationship: '自评',
      });
      // 2. 添加提名任务参与者
      participantsToCreate.push({
        evaluationId: evaluation.id,
        participantId: evaluation.userId,
        relationship: '提名',
      });
    }

    const savedParticipants = await this.participantsRepository.save(participantsToCreate);

    // 发送邀请邮件 (给被评估人，通知他们去自评和提名)
    this.sendInvites(savedParticipants);

    return savedEvaluations;
  }

  async nominateEvaluators(userId: number, dto: NominateEvaluatorsDto): Promise<any> {
    // 1. 验证评估是否存在且属于该用户
    const evaluation = await this.evaluationsRepository.findOne({
      where: { id: dto.evaluationId, userId: userId }
    });

    if (!evaluation) {
      throw new Error('评估任务不存在或无权限');
    }

    // 2. 验证提名人数规则 (已放宽限制，允许为空)
    // const superiors = dto.nominators.filter(n => n.relationship === '上级');
    // const peers = dto.nominators.filter(n => n.relationship === '平级');
    // const subordinates = dto.nominators.filter(n => n.relationship === '下级');

    // if (superiors.length !== 1) {
    //   throw new Error('必须选择 1 位上级');
    // }
    // if (peers.length !== 2) {
    //   throw new Error('必须选择 2 位平级同事');
    // }
    // if (subordinates.length !== 2) {
    //   throw new Error('必须选择 2 位下级同事');
    // }

    // 3. 清除旧的提名（非自评的）
    await this.participantsRepository.delete({
      evaluationId: evaluation.id,
      relationship: In(['上级', '平级', '下级'])
    });

    // 4. 创建新的参与者记录
    const participantsToCreate: Partial<EvaluationParticipant>[] = dto.nominators.map(n => ({
      evaluationId: evaluation.id,
      participantId: n.userId,
      relationship: n.relationship,
      status: 'pending' as any
    }));

    const savedParticipants = await this.participantsRepository.save(participantsToCreate);

    // 5. 更新“提名”任务状态为已完成
    await this.participantsRepository.update(
      {
        evaluationId: evaluation.id,
        participantId: userId,
        relationship: '提名'
      },
      { status: 'completed' as any }
    );

    // 6. 发送邮件给被提名人
    this.sendInvites(savedParticipants);

    return { success: true, count: savedParticipants.length };
  }

  private async sendInvites(participants: EvaluationParticipant[]) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    
    for (const participant of participants) {
      // 跳过自评，通常不需要邮件通知，或者文案不同
      if (participant.relationship === '自评') {
        continue;
      }

      try {
        // 获取参与者信息
        const user = await this.usersService.findOne(participant.participantId);
        // 获取被评估者信息
        const evaluation = await this.evaluationsRepository.findOne({
          where: { id: participant.evaluationId },
          relations: ['user']
        });

        if (user && user.email && evaluation && evaluation.user) {
          const evaluationLink = `${frontendUrl}/evaluation/fill/${participant.id}`; // 假设前端有这个路由
          
          await this.notificationsService.sendEvaluationInvite(
            user.email,
            user.name || 'User',
            evaluation.user.name || 'Evaluatee',
            evaluationLink
          );
        }
      } catch (error) {
        console.error(`Failed to send invite to participant ${participant.id}`, error);
      }
    }
  }

  submitResponse(response: Partial<EvaluationResponse>): Promise<EvaluationResponse> {
    const newResponse = this.evaluationResponsesRepository.create(response);
    return this.evaluationResponsesRepository.save(newResponse);
  }

  async getProgress(evaluationId: number): Promise<any> {
    const evaluation = await this.evaluationsRepository.findOne({ where: { id: evaluationId }, relations: ['responses'] });
    if (!evaluation) {
      return null;
    }
    // 在这里可以添加更复杂的进度计算逻辑
    return {
      total: 100, // 假设总共有100个评估者
      completed: evaluation.responses.length,
    };
  }

  // 批量提交问卷回答
  async submitQuestionnaire(
    submission: QuestionnaireSubmission,
    respondentId: number,
  ): Promise<{
    success: boolean;
    evaluationResult?: UserEvaluationResult;
    message: string;
  }> {
    try {
      // 验证评估是否存在
      const evaluation = await this.evaluationsRepository.findOne({
        where: { id: submission.evaluationId },
        relations: ['user'],
      });

      if (!evaluation) {
        return {
          success: false,
          message: '评估不存在',
        };
      }

      // 删除该用户之前的回答（如果有）
      await this.evaluationResponsesRepository.delete({
        evaluationId: submission.evaluationId,
        respondentId: respondentId,
      });

      // 保存新的回答
      const responseEntities = submission.responses.map(response => {
        return this.evaluationResponsesRepository.create({
          evaluationId: submission.evaluationId,
          respondentId: respondentId,
          questionCode: response.questionCode,
          score: response.score || 0,
          openText: response.openText,
          relationship: submission.relationship,
        });
      });

      await this.evaluationResponsesRepository.save(responseEntities);

      // 更新参与者状态为已完成
      await this.participantsRepository.update(
        {
          evaluationId: submission.evaluationId,
          participantId: respondentId,
        },
        { status: 'completed' as any }
      );

      // 计算得分（仅对评分题）
      const scoreResponses = new Map<string, number>();
      submission.responses.forEach(response => {
        if (response.score !== undefined) {
          scoreResponses.set(response.questionCode, response.score);
        }
      });

      const evaluationResult = await this.scoringService.calculateUserEvaluation(
        evaluation.userId,
        evaluation.user.role,
        scoreResponses
      );

      return {
        success: true,
        evaluationResult,
        message: '问卷提交成功'
      };

    } catch (error) {
      console.error('提交问卷时出错:', error);
      return {
        success: false,
        message: '提交失败，请重试'
      };
    }
  }

  // 获取评估的所有回答
  async getEvaluationResponses(evaluationId: number): Promise<EvaluationResponse[]> {
    return this.evaluationResponsesRepository.find({
      where: { evaluationId },
      relations: ['respondent']
    });
  }

  // 计算360度评估结果
  async calculate360DegreeEvaluation(evaluationId: number): Promise<{
    success: boolean;
    result?: UserEvaluationResult;
    message: string;
  }> {
    try {
      const evaluation = await this.evaluationsRepository.findOne({
        where: { id: evaluationId },
        relations: ['user', 'responses']
      });

      if (!evaluation) {
        return {
          success: false,
          message: '评估不存在'
        };
      }

      // 按回答者分组
      const responsesByRespondent = new Map<number, EvaluationResponse[]>();
      evaluation.responses.forEach(response => {
        if (!responsesByRespondent.has(response.respondentId)) {
          responsesByRespondent.set(response.respondentId, []);
        }
        responsesByRespondent.get(response.respondentId)!.push(response);
      });

      // 计算每个回答者的评估结果
      const evaluationResults: Array<{
        respondentId: number;
        relationship: string;
        result: UserEvaluationResult;
      }> = [];

      for (const [respondentId, responses] of responsesByRespondent) {
        const scoreResponses = new Map<string, number>();
        let relationship = '';

        responses.forEach(response => {
          if (response.score) {
            scoreResponses.set(response.questionCode, response.score);
          }
          if (!relationship) {
            relationship = response.relationship;
          }
        });

        const result = await this.scoringService.calculateUserEvaluation(
          evaluation.userId,
          evaluation.user.role,
          scoreResponses
        );

        evaluationResults.push({
          respondentId,
          relationship,
          result
        });
      }

      // 计算360度加权结果
      const finalResult = this.scoringService.calculate360DegreeScore(
        evaluation.userId,
        evaluationResults,
        evaluation.user.role
      );

      return {
        success: true,
        result: finalResult,
        message: '360度评估计算完成'
      };

    } catch (error) {
      console.error('计算360度评估时出错:', error);
      return {
        success: false,
        message: '计算失败，请重试'
      };
    }
  }

  // 获取用户的评估历史
  async getUserEvaluationHistory(userId: number): Promise<Evaluation[]> {
    return this.evaluationsRepository.find({
      where: { userId },
      relations: ['responses'],
      order: { createdAt: 'DESC' }
    });
  }

  // 获取我的评估任务 (支持状态筛选)
  async findMyTasks(participantId: number, status?: string): Promise<EvaluationParticipant[]> {
    const whereClause: any = { participantId };
    if (status) {
      whereClause.status = status;
    } else {
      // Default to pending if not specified? Or return all?
      // Previously it was pending only. Let's keep pending as default if no status provided to maintain compat, 
      // but controller might pass 'all' or specific statuses.
      // Actually, user requirement implies separate lists.
      // Let's change default to 'pending' to match previous behavior if unmodified controller calls it.
      whereClause.status = 'pending';
    }

    // If status is 'all', remove status filter
    if (status === 'all') {
      delete whereClause.status;
    }

    return this.participantsRepository.find({
      where: whereClause,
      relations: ['evaluation', 'evaluation.user'],
      order: { id: 'DESC' }
    });
  }
}
