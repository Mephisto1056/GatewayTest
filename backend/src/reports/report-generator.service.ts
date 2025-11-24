import { Injectable } from '@nestjs/common';
import { ScoringService, UserEvaluationResult, DimensionScore } from '../evaluations/scoring.service';
import { QuestionnairesService } from '../questionnaires/questionnaires.service';

export interface RadarChartData {
  dimension: string;
  subdimension?: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface SubDimensionData {
  parentDimension: string;
  subDimension: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface StrengthWeaknessAnalysis {
  strengths: Array<{
    dimension: string;
    score: number;
    percentage: number;
    description: string;
  }>;
  weaknesses: Array<{
    dimension: string;
    score: number;
    percentage: number;
    description: string;
    improvementSuggestion: string;
  }>;
  aiAnalysis: string;
}

export interface IndicatorMeaning {
  dimension: string;
  meaning: string;
  subdimensions?: Array<{
    name: string;
    description: string;
  }>;
}

export interface ActionRecommendation {
  priority: 'high' | 'medium' | 'low';
  dimension: string;
  currentScore: number;
  targetScore: number;
  actions: string[];
  timeline: string;
  resources: string[];
}

export interface LCPTrait {
  name: string;
  self: number;
  others: number;
}

export interface LCPDimension {
  dimension: string;
  color: string;
  traits: LCPTrait[];
}

export interface LCPChartData {
  creative: LCPDimension[];
  reactive: LCPDimension[];
}

export interface ComprehensiveReport {
  // 第一部分：个人领导力雷达图
  radarChart: {
    selfdirectedData: RadarChartData[];
    roleSpecificData: RadarChartData[];
    combinedMainData: RadarChartData[];
    combinedSubData: SubDimensionData[];
    lcpData: LCPChartData; // Add LCP Data
  };

  // ... existing fields
  strengthWeaknessAnalysis: StrengthWeaknessAnalysis;
  indicatorMeanings: IndicatorMeaning[];
  actionRecommendations: ActionRecommendation[];
  userInfo: {
    userId: number;
    userName: string;
    userRole: string;
    evaluationDate: Date;
    totalScore: number;
    maxTotalScore: number;
    overallPercentage: number;
  };
}

@Injectable()
export class ReportGeneratorService {
  constructor(
    private scoringService: ScoringService,
    private questionnairesService: QuestionnairesService,
  ) { }

  /**
   * 生成完整的个人评估报告
   */
  async generateComprehensiveReport(
    userId: number,
    userName: string,
    userRole: string,
    evaluationResult: UserEvaluationResult,
    selfResult?: UserEvaluationResult,
    othersResult?: UserEvaluationResult
  ): Promise<ComprehensiveReport> {
    // 第一部分：生成雷达图数据
    const radarChart = await this.generateRadarChartData(evaluationResult, selfResult, othersResult);

    // 第二部分：生成优劣势分析
    const strengthWeaknessAnalysis = await this.generateStrengthWeaknessAnalysis(evaluationResult);

    // 第三部分：生成指标含义
    const indicatorMeanings = await this.generateIndicatorMeanings(userRole);

    // 第四部分：生成行动建议
    const actionRecommendations = await this.generateActionRecommendations(evaluationResult);

    return {
      radarChart,
      strengthWeaknessAnalysis,
      indicatorMeanings,
      actionRecommendations,
      userInfo: {
        userId,
        userName,
        userRole,
        evaluationDate: new Date(),
        totalScore: evaluationResult.totalScore,
        maxTotalScore: evaluationResult.maxTotalScore,
        overallPercentage: evaluationResult.overallPercentage,
      },
    };
  }

  /**
   * 第一部分：生成个人领导力雷达图数据
   */
  private async generateRadarChartData(
    evaluationResult: UserEvaluationResult,
    selfResult?: UserEvaluationResult,
    othersResult?: UserEvaluationResult
  ): Promise<{
    selfdirectedData: RadarChartData[];
    roleSpecificData: RadarChartData[];
    combinedMainData: RadarChartData[];
    combinedSubData: SubDimensionData[];
    lcpData: LCPChartData;
  }> {
    const selfdirectedData: RadarChartData[] = evaluationResult.selfdirectedScores.map(dimension => ({
      dimension: dimension.dimension,
      score: dimension.totalScore,
      maxScore: dimension.maxScore,
      percentage: dimension.percentage,
    }));

    const roleSpecificData: RadarChartData[] = evaluationResult.roleSpecificScores.map(dimension => ({
      dimension: dimension.dimension,
      score: dimension.totalScore,
      maxScore: dimension.maxScore,
      percentage: dimension.percentage,
    }));

    // 合并主维度数据（内圈）
    const combinedMainData: RadarChartData[] = [...selfdirectedData, ...roleSpecificData];

    // 生成子维度数据（外圈）
    const combinedSubData: SubDimensionData[] = await this.generateSubDimensionData(evaluationResult);

    // 准备 Self 和 Others 的子维度数据
    let selfSubData: SubDimensionData[] = [];
    if (selfResult) {
      selfSubData = await this.generateSubDimensionData(selfResult);
    } else {
      // 如果没有传入 selfResult (e.g. 个人报告), 默认使用 main result
      selfSubData = combinedSubData;
    }

    let othersSubData: SubDimensionData[] = [];
    if (othersResult) {
      othersSubData = await this.generateSubDimensionData(othersResult);
    }

    // Generate LCP Data
    const lcpData = await this.generateLCPData(selfdirectedData, roleSpecificData, selfSubData, othersSubData);

    return {
      selfdirectedData,
      roleSpecificData,
      combinedMainData,
      combinedSubData,
      lcpData,
    };
  }

  /**
   * Generate LCP specific data structure
   */
  private async generateLCPData(
    selfdirectedData: RadarChartData[],
    roleSpecificData: RadarChartData[],
    selfSubData: SubDimensionData[],
    othersSubData: SubDimensionData[]
  ): Promise<LCPChartData> {
    const creative: LCPDimension[] = [];
    const reactive: LCPDimension[] = [];

    // Reactive keywords to identify reactive dimensions
    const reactiveKeywords = ['控制', '防卫', '顺从'];

    // Helper to find subdimensions for a dimension
    const getTraits = (dimName: string): LCPTrait[] => {
      // 从 selfSubData 中获取该维度的所有子维度
      const selfTraits = selfSubData.filter(s => s.parentDimension === dimName);
      
      return selfTraits.map(selfTrait => {
        // 尝试在 othersSubData 中找到对应的子维度
        const otherTrait = othersSubData.find(
          o => o.parentDimension === dimName && o.subDimension === selfTrait.subDimension
        );

        return {
          name: selfTrait.subDimension,
          self: selfTrait.percentage,
          others: otherTrait ? otherTrait.percentage : 0 // 如果没有 others 数据，默认为 0
        };
      });
    };

    // Helper to process a list of dimensions and add to correct group
    const processDimensions = (dimensions: RadarChartData[], defaultGroup: 'creative' | 'reactive') => {
      for (const d of dimensions) {
        // Determine if dimension is Reactive based on keywords
        // If keyword matches, force to Reactive group.
        // If not, use defaultGroup.
        const matchesKeyword = reactiveKeywords.some(keyword => d.dimension.includes(keyword));
        const targetGroup = matchesKeyword ? 'reactive' : defaultGroup;

        const traits = getTraits(d.dimension);

        // If no subdimensions found, use the main dimension as a single trait
        if (traits.length === 0) {
          // Fallback: Since we don't have explicit Self/Others scores for main dimension passed in easily,
          // we use the percentage from 'd' (which is the main result) for 'self'.
          // Ideally we should fetch 'others' score for main dimension too, but let's use 0 or approximate.
          // Actually, we can try to find the dimension in othersSubData (if it was treated as a subdim?) No.
          // Let's just use the main score.
          traits.push({
            name: d.dimension,
            self: d.percentage,
            others: d.percentage // Approximate fallback if no sub-data
          });
        }

        const lcpDim: LCPDimension = {
          dimension: d.dimension,
          color: targetGroup === 'reactive' ? '#A0522D' : '#7FB069',
          traits: traits
        };

        if (targetGroup === 'reactive') {
          reactive.push(lcpDim);
        } else {
          creative.push(lcpDim);
        }
      }
    };

    // Strategy:
    // Map Role Specific -> Creative (Upper Half)
    // Map Self Directed -> Reactive (Lower Half)
    // (unless keyword says otherwise)
    // FILTER: Ignore '开放式问题' dimension as per requirements
    const filterOpenEnded = (data: RadarChartData[]) => data.filter(d => !d.dimension.includes('开放式问题'));

    processDimensions(filterOpenEnded(roleSpecificData), 'creative');
    processDimensions(filterOpenEnded(selfdirectedData), 'reactive');


    // Assign specific colors for better visuals
    const creativeColors = ["#7FB069", "#5B9EA6", "#2E8B57", "#8FBC8F", "#DAA520"];
    creative.forEach((d, i) => d.color = creativeColors[i % creativeColors.length]);

    const reactiveColors = ["#A0522D", "#808080", "#BDB76B"];
    reactive.forEach((d, i) => d.color = reactiveColors[i % reactiveColors.length]);

    return { creative, reactive };
  }

  /**
   * 生成子维度数据
   */
  private async generateSubDimensionData(evaluationResult: UserEvaluationResult): Promise<SubDimensionData[]> {
    const subDimensionData: SubDimensionData[] = [];

    // 为每个主维度生成子维度数据
    const allDimensions = [...evaluationResult.selfdirectedScores, ...evaluationResult.roleSpecificScores];

    for (const dimension of allDimensions) {
      // 1. Try to group by subDimension from questionScores
      const subDimMap = new Map<string, { score: number; maxScore: number }>();
      let hasSubDimensions = false;

      for (const qScore of dimension.questionScores) {
        if (qScore.subDimension) {
          hasSubDimensions = true;
          const current = subDimMap.get(qScore.subDimension) || { score: 0, maxScore: 0 };
          current.score += qScore.finalScore;
          current.maxScore += 5; // Assuming max score per question is 5
          subDimMap.set(qScore.subDimension, current);
        }
      }

      if (hasSubDimensions) {
        // Use the extracted sub-dimensions
        for (const [subName, data] of subDimMap) {
          subDimensionData.push({
            parentDimension: dimension.dimension,
            subDimension: subName,
            score: data.score,
            maxScore: data.maxScore,
            percentage: (data.score / data.maxScore) * 100,
          });
        }
      } else {
        // Fallback to existing logic (hardcoded map)
        const subDimensions = this.getSubDimensionsForDimension(dimension.dimension);
        const questionsPerSub = Math.ceil(dimension.questionScores.length / subDimensions.length);

        subDimensions.forEach((subName, index) => {
          const startIndex = index * questionsPerSub;
          const endIndex = Math.min(startIndex + questionsPerSub, dimension.questionScores.length);
          const subQuestions = dimension.questionScores.slice(startIndex, endIndex);

          if (subQuestions.length > 0) {
            const subTotalScore = subQuestions.reduce((sum, q) => sum + q.finalScore, 0);
            const subMaxScore = subQuestions.length * 5;
            const subPercentage = (subTotalScore / subMaxScore) * 100;

            subDimensionData.push({
              parentDimension: dimension.dimension,
              subDimension: subName,
              score: subTotalScore,
              maxScore: subMaxScore,
              percentage: subPercentage,
            });
          }
        });
      }
    }

    return subDimensionData;
  }

  /**
   * 根据主维度获取子维度列表
   */
  private getSubDimensionsForDimension(dimension: string): string[] {
    const subDimensionMap: Record<string, string[]> = {
      '心智模式': ['思维开放性', '成长型思维', '学习能力'],
      '自我认知': ['优势认知', '不足认知', '行为动机'],
      '自我管理': ['情绪管理', '压力应对', '自我驱动'],
      '战略与远见': ['商业洞察', '战略规划', '创新能力'],
      '组织与文化': ['文化塑造', '人才培养', '决策与授权'],
      '资源利用能力': ['资源整合', '资源配置', '资源优化'],
      '危机韧性': ['风险识别', '应急处理', '恢复能力'],
      '沟通协调': ['沟通技巧', '协调能力', '影响力'],
    };

    return subDimensionMap[dimension] || ['子维度1', '子维度2', '子维度3'];
  }

  /**
   * 第二部分：生成优劣势分析
   */
  private async generateStrengthWeaknessAnalysis(evaluationResult: UserEvaluationResult): Promise<StrengthWeaknessAnalysis> {
    const allDimensions = [...evaluationResult.selfdirectedScores, ...evaluationResult.roleSpecificScores];

    // 识别优势（得分率 >= 75%）
    const strengths = allDimensions
      .filter(d => d.percentage >= 75)
      .map(d => ({
        dimension: d.dimension,
        score: d.totalScore,
        percentage: d.percentage,
        description: this.getStrengthDescription(d.dimension, d.percentage),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // 识别劣势（得分率 < 60%）
    const weaknesses = allDimensions
      .filter(d => d.percentage < 60)
      .map(d => ({
        dimension: d.dimension,
        score: d.totalScore,
        percentage: d.percentage,
        description: this.getWeaknessDescription(d.dimension, d.percentage),
        improvementSuggestion: this.getImprovementSuggestion(d.dimension),
      }))
      .sort((a, b) => a.percentage - b.percentage);

    // 生成AI分析
    const aiAnalysis = await this.generateAIAnalysis(evaluationResult, strengths, weaknesses);

    return {
      strengths,
      weaknesses,
      aiAnalysis,
    };
  }

  /**
   * 第三部分：生成指标含义（基于模板）
   */
  private async generateIndicatorMeanings(userRole: string): Promise<IndicatorMeaning[]> {
    const meanings: IndicatorMeaning[] = [
      {
        dimension: '自主导向',
        meaning: '领导者是否具备开放成长的心态、清晰的自我认知和良好的自我管理能力，能够不断学习提升并有效掌控自身行为与发展。',
        subdimensions: [
          { name: '心智模式', description: '思维开放性、成长型思维，有好奇心和开放的心态不断学习新知识、新技能、新观念' },
          { name: '自我认知', description: '具备明确的自我认知，清楚自身的优势与不足，了解自己的行为动机，具备较强自我认知能力的人，通常能够拥有更广阔的发展空间来提升自身素质' },
          { name: '自我管理', description: '在深入理解自身思维模式和心智结构的基础上，评估个体对自我管理、掌控及驾驭能力的实现程度' },
        ],
      },
    ];

    // 根据角色添加特定的指标含义
    if (userRole.includes('高层') || userRole.includes('总经理-1') || userRole.includes('OPS Manager')) {
      meanings.push(
        {
          dimension: '战略规划与执行',
          meaning: '衡量管理者能否洞察宏观趋势，制定清晰可落地的战略目标。',
          subdimensions: [
            { name: '商业洞察', description: '考察领导者在环境洞察、市场分析和机会识别方面的综合能力。这是战略规划与执行中的关键素养' },
            { name: '战略规划', description: '体现了领导者在战略制定、聚焦执行、全局把控和风险预判等方面的综合能力，是推动企业持续发展的关键素养' },
            { name: '创新能力', description: '领导者是否具备创新敏锐性和包容试错的管理风格，能够前瞻性识别外部变化，鼓励团队大胆探索，并通过快速试验推动企业持续创新' },
          ],
        },
        {
          dimension: '组织与文化',
          meaning: '反映管理者在推动制度化管理、建立高效流程，以及塑造结果导向和协作共担的组织文化方面的能力。',
          subdimensions: [
            { name: '文化塑造', description: '领导者是否具备高效组织与团队管理能力，能够推动跨部门协作，关注改进与根因分析，科学分配任务并关怀员工福祉，从而提升团队凝聚力和执行力' },
            { name: '人才培养', description: '领导者是否具备人才培养与保留能力，能够通过实战锻炼、岗位匹配、辅导发展和流程保障，系统提升团队整体能力并防范关键人才流失' },
            { name: '决策与授权', description: '领导者是否具备科学决策与授权能力，能够系统分析、合理分权、建立绩效管理体系并亲自承担关键业务责任，确保战略目标的有效实现' },
          ],
        },
        {
          dimension: '个人领导力',
          meaning: '反映管理者在整合和优化内外部资源、提升协作效率以及合理分配任务与权责方面，助力组织目标实现的能力，以及衡量管理者在面对危机和重大挑战时，能否保持冷静、快速响应、有效决策并带领团队共克难关，展现出坚韧与应变能力。',
          subdimensions: [
            { name: '资源整合', description: '领导者是具备资源整合与外部关系管理能力，能够前瞻布局、优化资源结构，并拓展合作网络以支撑战略目标' },
            { name: '资源管理', description: '领导者是否具备灵活高效的资源管理与分配能力，能够在不确定和变化环境下及时调整资源配置，并以公平且公司利益最大化为原则做出决策' },
            { name: '危机意识', description: '领导者是否具备危机应对与韧性管理能力，能够敏锐识别风险、快速调整战略，并制定备份方案保障企业持续生存' },
            { name: '快速纠错', description: '领导者是否具备快速纠错与持续改进能力，能够及时发现并承认问题，迅速调整方向，推动团队复盘并制定有效改进方案' },
            { name: '压力担当', description: '领导者是否具备压力担当和危机领导力，能够主动承担责任、带领团队应对挑战，通过透明沟通和关怀凝聚团队力量' },
          ],
        }
      );
    } else if (userRole.includes('中层') || userRole.includes('总经理-2') || userRole.includes('采购经理')) {
      meanings.push(
        {
          dimension: '战略执行',
          meaning: '在组织中，中层管理者是承上启下的中坚力量，为高层管理者提供有效信息、制定企业战略，清楚理解组织战略，并制定具体的执行方案。衡量管理者能否将公司战略有效转化为部门目标和可执行计划，统筹资源、灵活应变、分解任务并推动落地，确保战略目标的高效实现的能力。',
          subdimensions: [
            { name: '战略落地', description: '衡量管理者能够将公司战略有效转化为部门目标和具体行动，统筹资源、分解任务、推动跨部门协作，并在执行过程中持续优化，确保战略目标高效实现的能力' },
            { name: '资源整合', description: '能够前瞻性识别和优化企业所需的核心资源，灵活协调内外部资源，拓展合作网络，并以公司战略目标为导向进行合理配置，以支撑组织的持续发展和竞争力提升' },
            { name: '敏捷反应', description: '在面对外部变化或突发情况时，能够快速识别问题、灵活调整方案，并及时采取有效措施，确保组织目标的顺利达成' },
          ],
        },
        {
          dimension: '组织与人才',
          meaning: '组织的长期发展离不开优秀人才的持续培养和及时的供给。人才管理与培养是中层管理者在企业中需承担的重要任务。中层管理者在人才加速培养与保留的能力，以及符合企业特性的激励体系的设计能力，体现其对团队人才管理的能力水平。',
          subdimensions: [
            { name: '人才培养', description: '能够通过实战锻炼、岗位匹配、辅导发展和流程保障，系统提升团队整体能力并防范关键人才流失，确保团队持续成长和组织竞争力提升' },
            { name: '人才激励', description: '能够通过多样化的激励手段，增强团队成员的归属感和认同感，及时给予正向激励和认可，提升团队整体向心力和士气，促进团队持续高效发展' },
            { name: '跨部门协作', description: '能够主动推动和促进跨部门合作，打破部门壁垒，建立有效的协作机制，提升组织整体的协同效率和执行力' },
            { name: '责任担当', description: '在面对问题或挑战时，能够主动划定责任边界，承担相应责任，并积极组织资源解决障碍，推动团队和组织目标的实现' },
            { name: '冲突管理', description: '能够妥善处理团队或部门间的分歧与冲突，提出双方可接受的解决方案，快速化解矛盾，维护良好的合作氛围，促进组织协同共赢' },
          ],
        },
        {
          dimension: '个人领导力 – 科学决策',
          meaning: '在企业逐步发展壮大的过程中，管理者能否结合数据与经验进行决策，善用可视化和工具推动团队共识与效率，并在不确定性下做出理性判断与持续优化，是企业步入科学发展的重要能力。',
          subdimensions: [
            { name: '数据决策', description: '领导者能够结合数据与经验进行决策，善用可视化和工具推动团队共识与效率，并在不确定性下做出理性判断与持续优化' },
            { name: '管理效能', description: '领导者能够引导团队基于数据和事实达成共识，鼓励成员分享见解，善用工具提升沟通与流程效率，从而推动团队高效协作与持续优化' },
          ],
        }
      );
    } else if (userRole.includes('基层') || userRole.includes('一线') || userRole.includes('生产主管')) {
      meanings.push(
        {
          dimension: '战略规划与执行',
          meaning: '在基层管理者的层面，更重要的是如何准确理解公司的战略方向，并能够带领团队很好的执行。具体可体现为本部门任务的管理与执行。反映管理者能否将复杂任务有效拆解、合理分配、清晰传达，并能跟踪进展、优化流程和严格执行标准，从而带领团队高效完成目标。',
        },
        {
          dimension: '组织与人才',
          meaning: '作为组织的管理体系中最前线的管理者，基层管理者在组织建设与人才发展中起到不可忽视的作用，主要体现在团队氛围与激励、工作指导与教练、沟通与反馈',
          subdimensions: [
            { name: '团队氛围与激励', description: '考察管理者在塑造团队氛围与激励员工的能力表现' },
            { name: '工作指导与教练', description: '测评管理者如何培养员工技能和解决问题的能力' },
            { name: '沟通与反馈', description: '衡量管理者在促进信息流通、增进理解与协作、提升团队执行力方面的沟通与反馈能力' },
          ],
        },
        {
          dimension: '个人领导力',
          meaning: '该指标衡量管理者在专业能力、抗压性、积极心态、持续学习和以身作则等方面的表现，体现其作为团队榜样的个人效能与影响力。',
        }
      );
    }

    return meanings;
  }

  /**
   * 第四部分：生成后续行动建议
   */
  private async generateActionRecommendations(evaluationResult: UserEvaluationResult): Promise<ActionRecommendation[]> {
    const allDimensions = [...evaluationResult.selfdirectedScores, ...evaluationResult.roleSpecificScores];
    const recommendations: ActionRecommendation[] = [];

    // 为得分较低的维度生成改进建议
    const lowScoreDimensions = allDimensions.filter(d => d.percentage < 70).sort((a, b) => a.percentage - b.percentage);

    for (const dimension of lowScoreDimensions.slice(0, 3)) { // 最多3个重点改进维度
      const recommendation = await this.generateDimensionRecommendation(dimension);
      recommendations.push(recommendation);
    }

    // 为表现良好但仍有提升空间的维度生成建议
    const mediumScoreDimensions = allDimensions.filter(d => d.percentage >= 70 && d.percentage < 85);

    for (const dimension of mediumScoreDimensions.slice(0, 2)) { // 最多2个优化维度
      const recommendation = await this.generateDimensionRecommendation(dimension, 'medium');
      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * 生成单个维度的行动建议
   */
  private async generateDimensionRecommendation(
    dimension: DimensionScore,
    priority: 'high' | 'medium' | 'low' = 'high'
  ): Promise<ActionRecommendation> {
    const currentScore = dimension.percentage;
    const targetScore = priority === 'high' ? Math.min(currentScore + 20, 90) : Math.min(currentScore + 10, 85);

    const actions = this.getActionsByDimension(dimension.dimension, priority);
    const timeline = priority === 'high' ? '3-6个月' : '6-12个月';
    const resources = this.getResourcesByDimension(dimension.dimension);

    return {
      priority,
      dimension: dimension.dimension,
      currentScore: currentScore,
      targetScore: targetScore,
      actions,
      timeline,
      resources,
    };
  }

  /**
   * 根据维度获取具体行动建议（基于模板）
   */
  private getActionsByDimension(dimension: string, priority: 'high' | 'medium' | 'low'): string[] {
    const actionMap: Record<string, string[]> = {
      '创新能力': [
        '组织"创新工作坊"，鼓励小步快跑、试错文化',
        '设立"创新基金"，支持跨部门创新项目',
        '每季度进行一次外部趋势分享会，拓宽视野',
        '建立创新激励机制，鼓励员工提出改进建议',
        '学习设计思维方法，提升创新思维能力',
      ],
      '资源管理与整合': [
        '建立"资源地图"，明确内部资源分布与外部合作机会',
        '引入资源预警机制，提前识别资源缺口',
        '学习项目管理工具，提升资源调度效率',
        '建立跨部门资源共享机制',
        '定期进行资源利用效率评估',
      ],
      '决策与授权': [
        '推行"决策日志"，记录重大决策过程与结果，定期复盘',
        '设立"授权清单"，明确哪些事项可交由下属决定',
        '开展"授权与信任"主题培训，提升管理层的放权意识',
        '建立决策评估机制，提高决策质量',
        '学习决策分析工具和方法',
      ],
      '人才培养与激励': [
        '建立"导师制"，每位管理者带教1-2名高潜员工',
        '设计多元化激励方案（如非物质奖励、成长路径规划）',
        '每半年进行一次"员工敬业度调研"，针对性改进管理方式',
        '建立员工职业发展通道，提供成长机会',
        '学习教练技术，提升人才培养能力',
      ],
      '战略规划与执行': [
        '学习战略分解方法，将公司战略转化为部门目标',
        '建立任务跟踪机制，确保执行进度可控',
        '优化工作流程，提高执行效率',
        '加强与上级的沟通，确保战略理解准确',
        '定期进行执行效果评估和调整',
      ],
      '组织与人才': [
        '学习团队建设技巧，提升团队凝聚力',
        '建立有效的沟通机制，促进信息流通',
        '开展团队激励活动，提升员工积极性',
        '学习教练技术，提升员工指导能力',
        '建立反馈机制，及时了解员工需求',
      ],
      '个人领导力': [
        '制定个人能力提升计划，持续学习新知识',
        '加强压力管理，提升抗压能力',
        '树立积极心态，以身作则影响团队',
        '提升专业技能，保持行业竞争力',
        '建立个人品牌，提升影响力',
      ],
      '自主导向': [
        '参加成长型思维培训课程',
        '建立定期反思和学习的习惯',
        '主动寻求他人反馈并开放接受',
        '进行360度反馈评估，提升自我认知',
        '学习情绪管理技巧，提升自我管理能力',
      ],
    };

    const actions = actionMap[dimension] || [
      '制定针对性的能力提升计划',
      '寻求相关培训和学习机会',
      '向优秀同事学习最佳实践',
      '定期评估和调整改进策略',
    ];

    return priority === 'high' ? actions.slice(0, 3) : actions.slice(0, 2);
  }

  /**
   * 根据维度获取所需资源
   */
  private getResourcesByDimension(dimension: string): string[] {
    const resourceMap: Record<string, string[]> = {
      '创新能力': ['创新基金', '培训预算', '外部专家', '创新工具和平台'],
      '资源管理与整合': ['项目管理软件', '资源分析工具', '培训课程', '外部咨询'],
      '决策与授权': ['决策分析工具', '培训资源', '教练支持', '管理制度优化'],
      '人才培养与激励': ['培训预算', '激励基金', '导师资源', '评估工具'],
      '战略规划与执行': ['战略分析工具', '项目管理软件', '培训资源', '沟通平台'],
      '组织与人才': ['团队建设活动', '沟通工具', '培训课程', '激励资源'],
      '个人领导力': ['学习资源', '教练支持', '压力管理工具', '专业培训'],
      '自主导向': ['评估工具', '培训预算', '导师支持', '学习资源'],
    };

    return resourceMap[dimension] || ['培训预算', '学习时间', '实践机会', '专业指导'];
  }

  /**
   * 生成优势描述（基于模板格式）
   */
  private getStrengthDescription(dimension: string, percentage: number): string {
    const strengthDescriptions: Record<string, string> = {
      '战略规划与执行': '能清晰理解公司战略方向，在任务分解和执行跟踪方面有一定基础。',
      '个人领导力': '在压力下仍能保持理性思考，行为与价值观一致，具备较好的情绪管理与自我调节能力。',
      '组织与人才': '在团队氛围营造和员工激励方面表现突出，具备较强的沟通协调能力。',
      '自主导向': '具备开放的学习心态和较强的自我认知能力，能够持续自我提升。',
    };

    const baseDescription = strengthDescriptions[dimension] || `在${dimension}方面表现优秀`;
    return `${baseDescription}（得分率：${percentage.toFixed(1)}%）`;
  }

  /**
   * 生成劣势描述（基于模板格式）
   */
  private getWeaknessDescription(dimension: string, percentage: number): string {
    const weaknessDescriptions: Record<string, string> = {
      '创新能力': '对新鲜事物接受度较低，缺乏试错文化推动力。在鼓励团队创新、支持快速迭代方面表现较弱。',
      '资源管理与整合': '在资源调配、外部网络建设、关键资源预警方面得分偏低。尤其在"信息不完整时敢于调配资源"方面信心不足。',
      '决策与授权': '在听取多方意见、有效授权、建立绩效跟踪机制方面有待加强。倾向于亲力亲为，未能充分信任下属。',
      '人才培养与激励': '在骨干员工保留、激励体系设计、个性化培养方面得分不高。对员工情绪和职业发展的关注不足。',
    };

    const baseDescription = weaknessDescriptions[dimension] || `${dimension}方面存在明显提升空间`;
    return `${baseDescription}（当前得分率：${percentage.toFixed(1)}%）`;
  }

  /**
   * 生成改进建议（基于模板格式）
   */
  private getImprovementSuggestion(dimension: string): string {
    const suggestionMap: Record<string, string> = {
      '创新能力': '建议组织创新工作坊，建立试错文化，鼓励团队提出创新想法并给予支持。',
      '资源管理与整合': '建议建立资源地图，引入预警机制，学习项目管理工具提升资源调度效率。',
      '决策与授权': '建议建立决策日志，设立授权清单，通过培训提升放权意识和信任度。',
      '人才培养与激励': '建议建立导师制，设计多元化激励方案，定期进行员工敬业度调研。',
      '战略规划与执行': '建议学习战略分解方法，建立任务跟踪机制，加强与上级的沟通协调。',
      '组织与人才': '建议加强团队建设，完善沟通机制，提升员工指导和激励能力。',
      '个人领导力': '建议制定个人提升计划，加强压力管理，持续学习新知识和技能。',
      '自主导向': '建议参加成长型思维培训，建立反思习惯，主动寻求反馈提升自我认知。',
    };

    return suggestionMap[dimension] || '建议制定具体的能力提升计划，通过培训和实践来改进此项能力。';
  }

  /**
   * 生成AI分析（模拟AI分析，实际可接入真实AI服务）
   */
  private async generateAIAnalysis(
    evaluationResult: UserEvaluationResult,
    strengths: any[],
    weaknesses: any[]
  ): Promise<string> {
    const overallPercentage = evaluationResult.overallPercentage;
    const userRole = evaluationResult.userRole;

    let analysis = `基于您的评估结果，整体领导力水平为${overallPercentage.toFixed(1)}%。`;

    if (overallPercentage >= 80) {
      analysis += '您展现出了优秀的领导力水平，在多个维度都有出色的表现。';
    } else if (overallPercentage >= 60) {
      analysis += '您具备良好的领导力基础，在某些方面表现突出，但仍有进一步提升的空间。';
    } else {
      analysis += '您的领导力还有很大的发展潜力，建议重点关注核心能力的提升。';
    }

    if (strengths.length > 0) {
      analysis += `\n\n您的主要优势体现在：${strengths.map(s => s.dimension).join('、')}等方面。`;
      analysis += '建议继续发挥这些优势，并将其作为带领团队和推动工作的核心竞争力。';
    }

    if (weaknesses.length > 0) {
      analysis += `\n\n需要重点改进的领域包括：${weaknesses.map(w => w.dimension).join('、')}。`;
      analysis += '建议制定系统性的能力提升计划，通过培训、实践和反馈来逐步改进。';
    }

    analysis += `\n\n作为${userRole}，建议您重点关注与角色相匹配的核心能力发展，同时保持持续学习和自我提升的心态。`;

    return analysis;
  }
}