import { Injectable } from '@nestjs/common';
import { QuestionnairesService } from '../questionnaires/questionnaires.service';

export interface ScoreCalculationResult {
  questionCode: string;
  originalScore: number;
  finalScore: number;
  isReversed: boolean;
  relevanceApplied: boolean;
  relevantQuestionCode?: string;
  relevantQuestionScore?: number;
  subDimension?: string;
  questionText?: string;
}

export interface DimensionScore {
  dimension: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  questionScores: ScoreCalculationResult[];
}

export interface UserEvaluationResult {
  userId: number;
  userRole: string;
  selfdirectedScores: DimensionScore[];
  roleSpecificScores: DimensionScore[];
  totalScore: number;
  maxTotalScore: number;
  overallPercentage: number;
}

@Injectable()
export class ScoringService {
  constructor(
    private questionnairesService: QuestionnairesService,
  ) { }

  /**
   * 计算单个问题的得分
   * @param questionCode 问题编号
   * @param score 原始得分
   * @param questionType 问题类型
   * @param selfdirectedScores 自主导向问题得分（用于相关性计算）
   */
  async calculateQuestionScore(
    questionCode: string,
    score: number,
    questionType: 'selfdirected' | 'highlevel' | 'mediumlevel' | 'lowlevel',
    selfdirectedScores?: Map<string, number>
  ): Promise<ScoreCalculationResult> {
    let question: any;

    // 根据问题类型获取问题信息
    switch (questionType) {
      case 'selfdirected':
        question = await this.questionnairesService.findSelfdirectedQuestionByCode(questionCode);
        break;
      case 'highlevel':
        question = await this.questionnairesService.findHighlevelQuestionByCode(questionCode);
        break;
      case 'mediumlevel':
        question = await this.questionnairesService.findMediumlevelQuestionByCode(questionCode);
        break;
      case 'lowlevel':
        question = await this.questionnairesService.findLowlevelQuestionByCode(questionCode);
        break;
    }

    if (!question) {
      throw new Error(`问题 ${questionCode} 未找到`);
    }

    let finalScore = score;
    let isReversed = false;
    let relevanceApplied = false;
    let relevantQuestionCode: string | undefined;
    let relevantQuestionScore: number | undefined;

    // 处理反向计分
    if (question.scoringRule === '反向计分') {
      finalScore = 6 - score;
      isReversed = true;
    }

    // 处理相关性计算（仅对非自主导向问题）
    if (questionType !== 'selfdirected' && question.relevance && selfdirectedScores) {
      relevantQuestionCode = question.relevance;
      if (relevantQuestionCode) {
        relevantQuestionScore = selfdirectedScores.get(relevantQuestionCode);

        if (relevantQuestionScore !== undefined) {
          // 相关性计算：(自主导向题目得分)*40% + (目标题目得分)*60%
          finalScore = relevantQuestionScore * 0.4 + finalScore * 0.6;
          relevanceApplied = true;
        }
      }
    }

    return {
      questionCode,
      originalScore: score,
      finalScore,
      isReversed,
      relevanceApplied,
      relevantQuestionCode,
      relevantQuestionScore,
      subDimension: question.evaluationSubDimension, // Populate subDimension
      questionText: question.questionText,
    };
  }

  /**
   * 计算维度得分
   * @param questions 问题列表
   * @param responses 用户回答
   * @param questionType 问题类型
   * @param selfdirectedScores 自主导向得分（用于相关性计算）
   */
  async calculateDimensionScores(
    questions: any[],
    responses: Map<string, number>,
    questionType: 'selfdirected' | 'highlevel' | 'mediumlevel' | 'lowlevel',
    selfdirectedScores?: Map<string, number>
  ): Promise<DimensionScore[]> {
    const dimensionMap = new Map<string, ScoreCalculationResult[]>();

    // 按维度分组计算
    for (const question of questions) {
      const userScore = responses.get(question.questionCode);
      if (userScore === undefined) continue;

      const scoreResult = await this.calculateQuestionScore(
        question.questionCode,
        userScore,
        questionType,
        selfdirectedScores
      );

      const dimension = question.evaluationDimension;
      if (!dimensionMap.has(dimension)) {
        dimensionMap.set(dimension, []);
      }
      dimensionMap.get(dimension)!.push(scoreResult);
    }

    // 计算每个维度的总分
    const dimensionScores: DimensionScore[] = [];
    for (const [dimension, questionScores] of dimensionMap) {
      const totalScore = questionScores.reduce((sum, q) => sum + q.finalScore, 0);
      const maxScore = questionScores.length * 5; // 每题最高5分

      dimensionScores.push({
        dimension,
        totalScore,
        maxScore,
        percentage: (totalScore / maxScore) * 100,
        questionScores,
      });
    }

    return dimensionScores;
  }

  /**
   * 计算用户完整评估结果
   * @param userId 用户ID
   * @param userRole 用户角色
   * @param responses 用户所有回答
   */
  async calculateUserEvaluation(
    userId: number,
    userRole: string,
    responses: Map<string, number>
  ): Promise<UserEvaluationResult> {
    // 获取对应角色的问卷
    const questionnaire = await this.questionnairesService.getQuestionnaireByUserRole(userRole);

    // 先计算自主导向得分
    const selfdirectedScores = await this.calculateDimensionScores(
      questionnaire.selfdirected,
      responses,
      'selfdirected'
    );

    // 创建自主导向得分映射，用于相关性计算
    const selfdirectedScoreMap = new Map<string, number>();
    for (const dimension of selfdirectedScores) {
      for (const questionScore of dimension.questionScores) {
        selfdirectedScoreMap.set(questionScore.questionCode, questionScore.finalScore);
      }
    }

    // 计算角色特定得分
    let questionType: 'highlevel' | 'mediumlevel' | 'lowlevel';
    switch (userRole.toLowerCase()) {
      case '高层领导者':
      case '总经理':
      case '总经理-1':
        questionType = 'highlevel';
        break;
      case '中层管理者':
      case '总经理-2':
        questionType = 'mediumlevel';
        break;
      case '基层管理者':
      case '一线管理者':
        questionType = 'lowlevel';
        break;
      default:
        throw new Error(`不支持的用户角色: ${userRole}`);
    }

    const roleSpecificScores = await this.calculateDimensionScores(
      questionnaire.roleSpecific,
      responses,
      questionType,
      selfdirectedScoreMap
    );

    // 计算总分
    const selfdirectedTotal = selfdirectedScores.reduce((sum, d) => sum + d.totalScore, 0);
    const roleSpecificTotal = roleSpecificScores.reduce((sum, d) => sum + d.totalScore, 0);
    const totalScore = selfdirectedTotal + roleSpecificTotal;

    const selfdirectedMaxTotal = selfdirectedScores.reduce((sum, d) => sum + d.maxScore, 0);
    const roleSpecificMaxTotal = roleSpecificScores.reduce((sum, d) => sum + d.maxScore, 0);
    const maxTotalScore = selfdirectedMaxTotal + roleSpecificMaxTotal;

    return {
      userId,
      userRole,
      selfdirectedScores,
      roleSpecificScores,
      totalScore,
      maxTotalScore,
      overallPercentage: (totalScore / maxTotalScore) * 100,
    };
  }

  /**
   * 聚合多个评估结果（求平均值）
   * 用于计算 "Others" 的平均得分
   */
  aggregateEvaluationResults(results: UserEvaluationResult[]): UserEvaluationResult {
    if (results.length === 0) {
      throw new Error('Cannot aggregate empty results');
    }

    const template = results[0];
    const count = results.length;

    // Deep copy template structure to avoid modifying original
    const aggregated: UserEvaluationResult = JSON.parse(JSON.stringify(template));

    // Helper to aggregate dimension scores
    const aggregateDimensions = (targetDims: DimensionScore[], sourceDimsList: DimensionScore[][]) => {
      for (let i = 0; i < targetDims.length; i++) {
        let totalScoreSum = 0;
        // Reset question scores for aggregation
        const questionScoreSums = new Map<string, number>();

        for (const sourceDims of sourceDimsList) {
          const sourceDim = sourceDims[i];
          if (sourceDim) {
            totalScoreSum += sourceDim.totalScore;
            
            for (const qScore of sourceDim.questionScores) {
              const current = questionScoreSums.get(qScore.questionCode) || 0;
              questionScoreSums.set(qScore.questionCode, current + qScore.finalScore);
            }
          }
        }

        // Set averages
        targetDims[i].totalScore = totalScoreSum / count;
        targetDims[i].percentage = (targetDims[i].totalScore / targetDims[i].maxScore) * 100;

        // Set question averages
        for (const qScore of targetDims[i].questionScores) {
          const sum = questionScoreSums.get(qScore.questionCode) || 0;
          qScore.finalScore = sum / count;
        }
      }
    };

    // Prepare lists for aggregation
    const selfdirectedLists = results.map(r => r.selfdirectedScores);
    const roleSpecificLists = results.map(r => r.roleSpecificScores);

    aggregateDimensions(aggregated.selfdirectedScores, selfdirectedLists);
    aggregateDimensions(aggregated.roleSpecificScores, roleSpecificLists);

    // Aggregate totals
    aggregated.totalScore = results.reduce((sum, r) => sum + r.totalScore, 0) / count;
    aggregated.overallPercentage = (aggregated.totalScore / aggregated.maxTotalScore) * 100;

    return aggregated;
  }

  /**
   * 计算360度评估权重得分
   * @param targetUserId 被评估用户ID
   * @param evaluationResults 所有评估结果
   * @param targetUserRole 被评估用户角色
   */
  calculate360DegreeScore(
    targetUserId: number,
    evaluationResults: Array<{
      respondentId: number;
      relationship: string;
      result: UserEvaluationResult;
    }>,
    targetUserRole: string
  ): UserEvaluationResult {
    // 根据角色确定权重
    let weights: { [key: string]: number };
    switch (targetUserRole.toLowerCase()) {
      case '高层领导者':
      case '总经理':
      case '总经理-1':
        weights = { '上级': 0.5, '平级': 0.3, '下级': 0.2 };
        break;
      case '中层管理者':
      case '总经理-2':
        weights = { '上级': 0.4, '平级': 0.4, '下级': 0.2 };
        break;
      case '基层管理者':
      case '一线管理者':
        weights = { '上级': 0.3, '平级': 0.3, '下级': 0.4 };
        break;
      default:
        throw new Error(`不支持的用户角色: ${targetUserRole}`);
    }

    // 按关系分组
    const groupedResults = new Map<string, UserEvaluationResult[]>();
    for (const evaluation of evaluationResults) {
      const relationship = evaluation.relationship;
      if (!groupedResults.has(relationship)) {
        groupedResults.set(relationship, []);
      }
      groupedResults.get(relationship)!.push(evaluation.result);
    }

    // 1. First, aggregate results within each group (average)
    const groupAverages = new Map<string, UserEvaluationResult>();
    
    for (const [relationship, results] of groupedResults) {
      if (results.length > 0) {
        groupAverages.set(relationship, this.aggregateEvaluationResults(results));
      }
    }

    // 2. Then apply weights to the group averages
    // Use template from the first available group result to build structure
    const template = evaluationResults[0].result;
    const weightedResult: UserEvaluationResult = JSON.parse(JSON.stringify(template));

    // Reset scores in weightedResult
    const resetDimensions = (dims: DimensionScore[]) => {
      dims.forEach(d => {
        d.totalScore = 0;
        d.percentage = 0;
        d.questionScores.forEach(q => q.finalScore = 0);
      });
    };
    resetDimensions(weightedResult.selfdirectedScores);
    resetDimensions(weightedResult.roleSpecificScores);
    weightedResult.totalScore = 0;
    weightedResult.overallPercentage = 0;

    // Apply weights
    let totalWeightApplied = 0;

    const applyWeightToDimensions = (targetDims: DimensionScore[], sourceDims: DimensionScore[], weight: number) => {
      for (let i = 0; i < targetDims.length; i++) {
        if (sourceDims[i]) {
          targetDims[i].totalScore += sourceDims[i].totalScore * weight;
          
          for (let j = 0; j < targetDims[i].questionScores.length; j++) {
             targetDims[i].questionScores[j].finalScore += sourceDims[i].questionScores[j].finalScore * weight;
          }
        }
      }
    };

    for (const [relationship, groupAvg] of groupAverages) {
      const weight = weights[relationship] || 0;
      if (weight === 0) continue;

      totalWeightApplied += weight;

      applyWeightToDimensions(weightedResult.selfdirectedScores, groupAvg.selfdirectedScores, weight);
      applyWeightToDimensions(weightedResult.roleSpecificScores, groupAvg.roleSpecificScores, weight);

      weightedResult.totalScore += groupAvg.totalScore * weight;
    }

    // If total weight is not 1 (e.g. missing some relationship group), normalize?
    // Requirement usually implies missing groups might need redistribution or just raw weight.
    // Assuming weights add up to 1 if all present. If missing, we might need to re-normalize.
    // For simplicity, if totalWeightApplied > 0, we divide by it to normalize.
    if (totalWeightApplied > 0 && totalWeightApplied < 0.99) {
       // Normalize factor
       const factor = 1 / totalWeightApplied;
       
       const normalizeDimensions = (dims: DimensionScore[]) => {
         dims.forEach(d => {
           d.totalScore *= factor;
           d.percentage = (d.totalScore / d.maxScore) * 100; // Recalculate percentage
           d.questionScores.forEach(q => q.finalScore *= factor);
         });
       };
       
       normalizeDimensions(weightedResult.selfdirectedScores);
       normalizeDimensions(weightedResult.roleSpecificScores);
       weightedResult.totalScore *= factor;
       weightedResult.overallPercentage = (weightedResult.totalScore / weightedResult.maxTotalScore) * 100;
    } else {
       // Just update percentages
       const updatePercentages = (dims: DimensionScore[]) => {
         dims.forEach(d => {
           d.percentage = (d.totalScore / d.maxScore) * 100;
         });
       };
       updatePercentages(weightedResult.selfdirectedScores);
       updatePercentages(weightedResult.roleSpecificScores);
       weightedResult.overallPercentage = (weightedResult.totalScore / weightedResult.maxTotalScore) * 100;
    }

    weightedResult.userId = targetUserId;
    
    return weightedResult;
  }
}