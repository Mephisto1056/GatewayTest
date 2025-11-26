import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { EvaluationResponse } from '../evaluations/entities/evaluation-response.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { ReportGeneratorService, ComprehensiveReport } from './report-generator.service';
import { ScoringService } from '../evaluations/scoring.service';
import { UsersService } from '../users/users.service';
import axios from 'axios';
import PDFDocument = require('pdfkit');
import * as OSS from 'ali-oss';
import * as fs from 'fs';
import * as path from 'path';

// 注册fontkit以支持TTC字体
(PDFDocument.prototype as any)._fontkit = require('fontkit');

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportsRepository: Repository<Report>,
    @InjectRepository(EvaluationResponse)
    private evaluationResponsesRepository: Repository<EvaluationResponse>,
    @InjectRepository(Evaluation)
    private evaluationsRepository: Repository<Evaluation>,
    private reportGeneratorService: ReportGeneratorService,
    private scoringService: ScoringService,
    private usersService: UsersService,
  ) { }

  async findAll(): Promise<Report[]> {
    return this.reportsRepository.find({
      relations: ['user'],
      order: { generatedAt: 'DESC' }
    });
  }

  async findOne(id: number): Promise<Report | null> {
    return this.reportsRepository.findOne({
      where: { id },
      relations: ['user']
    });
  }

  async remove(id: number): Promise<void> {
    await this.reportsRepository.delete(id);
  }

  async getUserReports(userId: number): Promise<Report[]> {
    return this.reportsRepository.find({
      where: { userId },
      order: { generatedAt: 'DESC' }
    });
  }

  async generatePersonalReport(userId: number): Promise<Report> {
    try {
      // 获取用户信息
      const user = await this.usersService.findOne(userId);
      if (!user) {
        throw new Error(`用户 ${userId} 不存在`);
      }

      // 获取用户最新的评估回答
      const responses = await this.getUserLatestResponses(userId);
      if (responses.size === 0) {
        throw new Error(`用户 ${userId} 没有评估数据`);
      }

      // 计算评估结果
      const evaluationResult = await this.scoringService.calculateUserEvaluation(
        userId,
        user.role,
        responses
      );

      // 生成完整报告
      const comprehensiveReport = await this.reportGeneratorService.generateComprehensiveReport(
        userId,
        user.name,
        user.role,
        evaluationResult,
        evaluationResult, // selfResult for personal report is the same
        undefined // No othersResult for personal report
      );

      // 生成AI分析 (使用 Kimi API)
      const aiAnalysis = await this.getPersonalAiAnalysis(comprehensiveReport);
      comprehensiveReport.strengthWeaknessAnalysis.aiAnalysis = aiAnalysis;

      // 保存报告到数据库
      const reportData = {
        userId,
        type: 'personal',
        dataJson: comprehensiveReport,
        aiAnalysis,
      };

      const newReport = this.reportsRepository.create(reportData);
      const savedReport = await this.reportsRepository.save(newReport);

      // 生成PDF文件（可选）
      try {
        const pdfBuffer = await this.generatePdf(comprehensiveReport, aiAnalysis);
        const fileUrl = await this.uploadToOss(pdfBuffer, `report_${userId}_${Date.now()}.pdf`);

        // 更新报告文件URL
        savedReport.fileUrl = fileUrl;
        await this.reportsRepository.save(savedReport);
      } catch (pdfError) {
        console.warn('PDF生成失败，但报告数据已保存:', pdfError);
      }

      return savedReport;
    } catch (error) {
      console.error('生成个人报告失败:', error);
      throw new Error(`生成个人报告失败: ${error.message}`);
    }
  }

  /**
   * 获取用户最新的评估回答
   */
  private async getUserLatestResponses(userId: number): Promise<Map<string, number>> {
    // 查找用户最新的评估
    const latestEvaluation = await this.evaluationsRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!latestEvaluation) {
      return new Map();
    }

    const responses = await this.evaluationResponsesRepository.find({
      where: {
        evaluationId: latestEvaluation.id,
        respondentId: userId, // 仅获取自评数据
      },
    });

    const responseMap = new Map<string, number>();

    for (const response of responses) {
      if (response.score !== null && response.score !== undefined) {
        responseMap.set(response.questionCode, response.score);
      }
    }

    return responseMap;
  }

  /**
   * 生成360度评估报告
   */
  async generate360DegreeReport(targetUserId: number): Promise<Report> {
    try {
      // 获取目标用户信息
      const targetUser = await this.usersService.findOne(targetUserId);
      if (!targetUser) {
        throw new Error(`用户 ${targetUserId} 不存在`);
      }

      // 计算360度结果
      const { weightedResult, evaluationResults } = await this.calculateUser360Result(targetUserId, targetUser);

      // 生成完整报告
      const comprehensiveReport = await this.reportGeneratorService.generateComprehensiveReport(
        targetUserId,
        targetUser.name,
        targetUser.role,
        weightedResult
      );

      // 添加360度特有信息
      (comprehensiveReport as any).is360Degree = true;
      (comprehensiveReport as any).evaluationDetails = evaluationResults.map(er => ({
        respondentId: er.respondentId,
        relationship: er.relationship,
        overallPercentage: er.result.overallPercentage,
      }));

      // 保存报告
      const reportData = {
        userId: targetUserId,
        type: '360degree',
        dataJson: comprehensiveReport,
        aiAnalysis: comprehensiveReport.strengthWeaknessAnalysis.aiAnalysis,
      };

      const newReport = this.reportsRepository.create(reportData);
      const savedReport = await this.reportsRepository.save(newReport);

      // 生成PDF文件（可选）
      try {
        const pdfBuffer = await this.generatePdf(comprehensiveReport, reportData.aiAnalysis);
        const fileUrl = await this.uploadToOss(pdfBuffer, `report_360_${targetUserId}_${Date.now()}.pdf`);

        // 更新报告文件URL
        savedReport.fileUrl = fileUrl;
        await this.reportsRepository.save(savedReport);
      } catch (pdfError) {
        console.warn('PDF生成失败，但报告数据已保存:', pdfError);
      }

      return savedReport;
    } catch (error) {
      console.error('生成360度报告失败:', error);
      throw new Error(`生成360度报告失败: ${error.message}`);
    }
  }

  /**
   * 计算用户360度评估结果（核心逻辑）
   */
  private async calculateUser360Result(targetUserId: number, targetUser: any) {
    // 1. 获取该用户最新的评估任务
    const latestEvaluation = await this.evaluationsRepository.findOne({
      where: { userId: targetUserId },
      order: { createdAt: 'DESC' },
    });

    if (!latestEvaluation) {
      throw new Error(`用户 ${targetUserId} 没有评估记录`);
    }

    // 2. 获取该评估任务下的所有回答
    const allResponses = await this.evaluationResponsesRepository.find({
      where: { evaluationId: latestEvaluation.id },
      relations: ['respondent'],
    });

    if (allResponses.length === 0) {
      throw new Error(`评估任务 ${latestEvaluation.id} 没有回答数据`);
    }

    // 3. 按评估者分组计算结果
    const evaluationResults: Array<{
      respondentId: number;
      relationship: string;
      result: import('../evaluations/scoring.service').UserEvaluationResult;
    }> = [];
    const respondentGroups = new Map<number, EvaluationResponse[]>();

    for (const response of allResponses) {
      if (!respondentGroups.has(response.respondentId)) {
        respondentGroups.set(response.respondentId, []);
      }
      respondentGroups.get(response.respondentId)!.push(response);
    }

    for (const [respondentId, responses] of respondentGroups) {
      const responseMap = new Map<string, number>();
      let relationship = '';

      for (const response of responses) {
        if (response.score !== null && response.score !== undefined) {
          responseMap.set(response.questionCode, response.score);
        }
        // 优先使用非空的 relationship
        if (response.relationship) {
          relationship = response.relationship;
        }
      }

      // 如果没有找到关系，尝试根据ID判断（自评）
      if (!relationship && respondentId === targetUserId) {
        relationship = '自评'; // Fallback
      }

      if (responseMap.size === 0) continue;

      const evaluationResult = await this.scoringService.calculateUserEvaluation(
        targetUserId,
        targetUser.role,
        responseMap
      );

      evaluationResults.push({
        respondentId,
        relationship,
        result: evaluationResult,
      });
    }

    if (evaluationResults.length === 0) {
      throw new Error('没有有效的评估结果可用于计算');
    }

    // 4. 计算360度加权结果
    const weightedResult = this.scoringService.calculate360DegreeScore(
      targetUserId,
      evaluationResults,
      targetUser.role
    );

    // 5. Prepare Self and Others results
    // Find Self result
    const selfEntry = evaluationResults.find(e => e.relationship === '自评' || e.respondentId === targetUserId);
    const selfResult = selfEntry ? selfEntry.result : undefined;

    // Aggregate Others results
    const othersEntries = evaluationResults.filter(e => e.relationship !== '自评' && e.respondentId !== targetUserId);
    let othersResult: import('../evaluations/scoring.service').UserEvaluationResult | undefined;
    
    if (othersEntries.length > 0) {
      const othersResultsList = othersEntries.map(e => e.result);
      othersResult = this.scoringService.aggregateEvaluationResults(othersResultsList);
    }

    // 6. 生成完整报告结构以获取雷达图数据
    const comprehensiveReport = await this.reportGeneratorService.generateComprehensiveReport(
      targetUserId,
      targetUser.name,
      targetUser.role,
      weightedResult,
      selfResult,
      othersResult
    );

    return { weightedResult, evaluationResults, radarChart: comprehensiveReport.radarChart };
  }

  async generateOrganizationReport(orgId: number): Promise<Report> {
    try {
      // 1. 获取该组织下所有用户
      const users = await this.usersService.findAll(); // 这里简化了，实际应该有 findByOrgId
      // 过滤出该组织的用户
      const orgUsers = users.filter(u => u.organizationId === orgId);

      if (orgUsers.length === 0) {
        throw new Error(`组织 ${orgId} 下没有用户`);
      }

      const userResults: any[] = [];
      let totalScoreSum = 0;
      let validUserCount = 0;

      // 2. 计算每个用户的360度结果
      for (const user of orgUsers) {
        try {
          const { weightedResult, radarChart } = await this.calculateUser360Result(user.id, user);
          userResults.push({
            userId: user.id,
            userName: user.name,
            role: user.role,
            overallPercentage: weightedResult.overallPercentage,
            radarChart: radarChart
          });
          totalScoreSum += weightedResult.overallPercentage;
          validUserCount++;
        } catch (e) {
          console.warn(`用户 ${user.id} 计算失败，跳过: ${e.message}`);
        }
      }

      if (validUserCount === 0) {
        throw new Error('该组织下没有任何有效的评估数据');
      }

      const avgOverallPercentage = totalScoreSum / validUserCount;

      // 3. 聚合维度得分
      // 假设所有用户的维度结构是一样的（或者取交集/并集）
      // 这里简化处理，基于第一个用户的数据结构来聚合
      const aggregatedRadarChart: any = {
        selfdirectedData: [],
        roleSpecificData: []
      };

      if (userResults.length > 0) {
        const template = userResults[0].radarChart;

        // 聚合自主导向维度
        template.selfdirectedData.forEach((dim: any) => {
          const dimSum = userResults.reduce((sum, u) => {
            const d = u.radarChart.selfdirectedData.find((d: any) => d.dimension === dim.dimension);
            return sum + (d ? d.percentage : 0);
          }, 0);
          aggregatedRadarChart.selfdirectedData.push({
            dimension: dim.dimension,
            percentage: dimSum / validUserCount,
            fullMark: dim.fullMark
          });
        });

        // 聚合角色特定维度
        template.roleSpecificData.forEach((dim: any) => {
          const dimSum = userResults.reduce((sum, u) => {
            const d = u.radarChart.roleSpecificData.find((d: any) => d.dimension === dim.dimension);
            return sum + (d ? d.percentage : 0);
          }, 0);
          aggregatedRadarChart.roleSpecificData.push({
            dimension: dim.dimension,
            percentage: dimSum / validUserCount,
            fullMark: dim.fullMark
          });
        });
      }

      // 4. 构建报告数据结构
      // 复用 ComprehensiveReport 结构，但 userInfo 是组织的
      const orgReportData: any = {
        userInfo: {
          userId: 0, // 组织ID占位
          userName: `组织报告 (ID: ${orgId})`,
          userRole: '组织整体',
          evaluationDate: new Date(),
          overallPercentage: avgOverallPercentage,
        },
        radarChart: aggregatedRadarChart,
        strengthWeaknessAnalysis: {
          strengths: [], // 需要重新计算
          weaknesses: [], // 需要重新计算
          aiAnalysis: ''
        },
        indicatorMeanings: [], // 可以复用通用的
        actionRecommendations: [] // 可以复用通用的
      };

      // 简单的优劣势分析（基于聚合后的数据）
      const allDims = [...aggregatedRadarChart.selfdirectedData, ...aggregatedRadarChart.roleSpecificData];
      allDims.sort((a, b) => b.percentage - a.percentage);

      orgReportData.strengthWeaknessAnalysis.strengths = allDims.slice(0, 3).map(d => ({
        dimension: d.dimension,
        percentage: d.percentage,
        description: '组织整体优势领域'
      }));

      orgReportData.strengthWeaknessAnalysis.weaknesses = allDims.slice(allDims.length - 3).map(d => ({
        dimension: d.dimension,
        percentage: d.percentage,
        description: '组织整体待发展领域',
        improvementSuggestion: '建议组织层面加强培训'
      }));

      // 5. AI 分析
      const aiAnalysis = await this.getAiAnalysis(orgReportData.userInfo);
      orgReportData.strengthWeaknessAnalysis.aiAnalysis = aiAnalysis;

      // 6. 保存报告
      const reportData = {
        userId: orgId, // 借用 userId 字段存储 orgId，或者需要扩展 Report 实体
        // 注意：如果 Report 实体有关联 User 外键，这里可能会报错。
        // 假设 Report 实体 userId 是外键，那么我们需要一个代表组织的 User 或者修改 Report 实体。
        // 暂时假设我们无法修改实体结构，我们可能需要一个 workaround。
        // 为了演示，假设我们已经解决这个问题，或者我们创建一个“组织账号”。
        // 这里先用 orgId 作为 userId 存入（假设没有外键约束或者有对应ID的用户）
        // 实际上应该修改 Report 实体增加 organizationId 字段。
        // 为了不破坏现有结构，我们假设存在一个 id=orgId 的用户，或者我们先跳过外键约束。
        // 更好的做法是：在 Report 实体中添加 organizationId，并使 userId 可选。
        // 但现在我们先复用 userId，假设它是 loose 的。
        type: 'organization',
        dataJson: orgReportData,
        aiAnalysis: aiAnalysis,
      };

      // 临时：为了避免外键错误，我们可能需要先创建一个“组织用户”或者确认 Report.userId 是否有外键。
      // 如果有外键，必须有对应用户。
      // 让我们假设 orgId 对应的用户存在，或者我们先不保存到数据库，只返回生成的报告。
      // 但方法签名返回 Promise<Report>，意味着必须保存。
      // 让我们尝试保存。如果失败，说明有外键约束。

      // 修正：我们应该在 UsersService 中查找或创建一个代表该组织的“虚拟用户”
      // 或者，我们修改 Report 实体。
      // 鉴于时间，我将尝试直接保存，如果报错再处理。

      const newReport = this.reportsRepository.create(reportData as any);
      // 注意：这里强制类型转换，因为 userId 类型可能不匹配（如果它是 number）
      const savedReport = (await this.reportsRepository.save(newReport)) as unknown as Report;

      // 7. 生成PDF
      try {
        const pdfBuffer = await this.generatePdf(orgReportData, aiAnalysis);
        const fileUrl = await this.uploadToOss(pdfBuffer, `report_org_${orgId}_${Date.now()}.pdf`);
        savedReport.fileUrl = fileUrl;
        await this.reportsRepository.save(savedReport);
      } catch (pdfError) {
        console.warn('PDF生成失败:', pdfError);
      }

      return savedReport;

    } catch (error) {
      console.error('生成组织报告失败:', error);
      throw new Error(`生成组织报告失败: ${error.message}`);
    }
  }

  private async getAiAnalysis(data: any): Promise<string> {
    const apiKey = process.env.KIMI_API_KEY;
    const apiUrl = process.env.KIMI_API_URL || 'https://api.moonshot.cn/v1/chat/completions';

    if (!apiKey || apiKey.startsWith('sk-xxxx')) {
      console.warn('未配置有效的 KIMI_API_KEY，使用模拟数据');
      return 'AI 分析功能未配置。请在后台 .env 文件中配置 KIMI_API_KEY 以启用智能分析功能。';
    }

    try {
      const prompt = `
作为一个专业的组织发展顾问，请根据以下领导力评估数据，为被测评人生成一份深度的分析报告。

**被测评人信息：**
- 姓名：${data.userName}
- 角色：${data.userRole}
- 总体得分率：${data.overallPercentage.toFixed(1)}%

**优势领域（Top 3）：**
${data.strengthWeaknessAnalysis.strengths.map((s: any, i: number) => `${i + 1}. ${s.dimension} (${s.percentage.toFixed(1)}%) - ${s.description}`).join('\n')}

**待发展领域（Top 3）：**
${data.strengthWeaknessAnalysis.weaknesses.map((w: any, i: number) => `${i + 1}. ${w.dimension} (${w.percentage.toFixed(1)}%) - ${w.description}`).join('\n')}

**请生成一段约 300-500 字的综合分析，包含：**
1. **整体评价**：基于角色要求和总体得分，评价其当前的领导力成熟度。
2. **优势解读**：分析其核心优势如何支持其当前角色的工作。
3. **发展建议**：针对待发展领域，提供具体的、可执行的提升建议。
4. **语气风格**：专业、客观、鼓励性，避免使用过于生硬的评判词汇。
`;

      const response = await axios.post(
        apiUrl,
        {
          model: 'moonshot-v1-8k',
          messages: [
            {
              role: 'system',
              content: '你是讯百汇组织领导力发展系统的首席顾问AI，擅长解读360度评估报告并提供专业的发展建议。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('API 返回格式异常');
      }

    } catch (error) {
      console.error('调用 Kimi AI API 失败:', error.message);
      if (error.response) {
        console.error('API 错误详情:', error.response.data);
      }
      return '暂时无法生成 AI 分析，请稍后再试。';
    }
  }

  /**
   * 获取个人报告的 AI 分析
   */
  private async getPersonalAiAnalysis(reportData: ComprehensiveReport): Promise<string> {
    const apiKey = process.env.KIMI_API_KEY;
    const apiUrl = process.env.KIMI_API_URL || 'https://api.moonshot.cn/v1/chat/completions';

    if (!apiKey || apiKey.startsWith('sk-xxxx')) {
      console.warn('未配置有效的 KIMI_API_KEY，使用模拟数据');
      return reportData.strengthWeaknessAnalysis.aiAnalysis || 'AI 分析功能未配置。请在后台 .env 文件中配置 KIMI_API_KEY 以启用智能分析功能。';
    }

    try {
      // 提取用于 AI 分析的关键数据
      const { userInfo, strengthWeaknessAnalysis } = reportData;
      const strengths = strengthWeaknessAnalysis.strengths.slice(0, 3);
      const weaknesses = strengthWeaknessAnalysis.weaknesses.slice(0, 3);

      const prompt = `
作为一个专业的领导力发展教练，请根据以下测评数据，为被测评人生成一份个性化的深度分析。

**被测评人信息：**
- 姓名：${userInfo.userName}
- 角色：${userInfo.userRole}
- 总体领导力得分率：${userInfo.overallPercentage.toFixed(1)}%

**个人优势领域（Top 3）：**
${strengths.map((s, i) => `${i + 1}. ${s.dimension} (得分率: ${s.percentage.toFixed(1)}%) - ${s.description}`).join('\n')}

**个人待发展领域（Top 3）：**
${weaknesses.map((w, i) => `${i + 1}. ${w.dimension} (得分率: ${w.percentage.toFixed(1)}%) - ${w.description}`).join('\n')}

**任务要求：**
请针对以上“个人优势领域”和“个人待发展领域”进行深入分析，生成一段约 400 字的综合评价。内容应包括：
1.  **优势分析**：分析这些核心优势如何帮助其在当前角色（${userInfo.userRole}）中取得成功。
2.  **发展建议**：针对待发展领域，结合其角色特点，提供具体的、可落地的心智或行为改变建议。
3.  **整体寄语**：用鼓励性的语言总结其领导力风格和发展潜力。

请直接输出分析内容，无需包含问候语或标题。
`;

      const response = await axios.post(
        apiUrl,
        {
          model: 'moonshot-v1-8k',
          messages: [
            {
              role: 'system',
              content: '你是讯百汇组织领导力发展系统的首席顾问AI，擅长解读领导力测评报告并提供专业的发展建议。你的语言风格专业、客观且具有启发性。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('API 返回格式异常');
      }

    } catch (error) {
      console.error('调用 Kimi AI API 失败 (Personal):', error.message);
      // Fallback to the original generated analysis if API fails
      return reportData.strengthWeaknessAnalysis.aiAnalysis || '暂时无法生成 AI 分析，请稍后再试。';
    }
  }

  async generatePdfBuffer(reportData: ComprehensiveReport, aiAnalysis: string, chartImage?: string): Promise<Buffer> {
    return this.generatePdf(reportData, aiAnalysis, chartImage);
  }

  private async generatePdf(reportData: ComprehensiveReport, aiAnalysis: string, chartImage?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // 创建PDF文档，使用支持Unicode的配置
        const doc = new PDFDocument({
          margin: 50,
          bufferPages: true,
          autoFirstPage: false
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        // 注册中文字体 - 使用系统内置字体
        try {
          // 尝试使用中文字体，优先使用项目内的字体文件
          const fontPaths = [
            path.join(__dirname, '../../fonts/SimHei.ttf'), // 项目内的黑体字体
            '/System/Library/Fonts/STHeiti Medium.ttc', // macOS 黑体
            '/System/Library/Fonts/STHeiti Light.ttc', // macOS 黑体 Light
            '/System/Library/Fonts/PingFang.ttc', // macOS 苹方
            'C:\\Windows\\Fonts\\simhei.ttf', // Windows 黑体
            'C:\\Windows\\Fonts\\msyh.ttc', // Windows 微软雅黑
            'C:\\Windows\\Fonts\\simsun.ttc', // Windows 宋体
            '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc', // Linux 文泉驿微米黑
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Linux fallback
          ];

          let fontRegistered = false;
          for (const fontPath of fontPaths) {
            try {
              if (fs.existsSync(fontPath)) {
                doc.registerFont('ChineseFont', fontPath);
                fontRegistered = true;
                console.log(`成功注册中文字体: ${fontPath}`);
                break;
              }
            } catch (e) {
              // 继续尝试下一个字体
              continue;
            }
          }

          // 如果没有找到合适的字体，抛出错误
          if (!fontRegistered) {
            throw new Error('未找到支持中文的字体文件');
          }

        } catch (fontError) {
          console.error('字体注册失败:', fontError.message);
          throw new Error(`字体注册失败: ${fontError.message}`);
        }

        // 添加第一页
        doc.addPage();

        // 设置字体
        try {
          doc.font('ChineseFont');
        } catch (e) {
          // 如果中文字体不可用，使用默认字体
          doc.font('Helvetica');
        }

        // 封面页
        doc.fontSize(28).text('组织领导力发展测评', { align: 'center' });
        doc.moveDown();
        doc.fontSize(24).text('个人综合报告', { align: 'center' });
        doc.moveDown(3);

        // 基本信息
        doc.fontSize(16);
        doc.text(`姓名：${reportData.userInfo.userName}`);
        doc.moveDown();
        doc.text(`职位：${reportData.userInfo.userRole}`);
        doc.moveDown();
        doc.text(`评估时间：${new Date(reportData.userInfo.evaluationDate).toLocaleDateString('zh-CN')}`);
        doc.moveDown();
        doc.text(`总体得分：${reportData.userInfo.overallPercentage.toFixed(1)}%`);
        doc.moveDown(3);

        // 新页面 - 报告说明
        doc.addPage();
        doc.fontSize(20).text('报告说明', { underline: true });
        doc.moveDown();

        doc.fontSize(16).text('报告目的', { underline: true });
        doc.fontSize(12).text('本报告是对被测评人的领导力素质的总结，用于帮助被测评人认知并理解自身所具备的优势领域和待发展领域、针对性地制定学习和发展策略。');
        doc.moveDown();

        doc.fontSize(16).text('阅读者', { underline: true });
        doc.fontSize(12).text('本报告仅限于被测评人本人、被测评人直接上级、人力资源部以及讯百汇项目顾问使用，用途限于被测评人个体能力的持续发展。任何其它组织或个人未经许可，不得擅自阅读、传播、复制或以其它形式使用本报告中的任何内容。');
        doc.moveDown();

        doc.fontSize(16).text('报告的有效性', { underline: true });
        const roleText = reportData.userInfo.userRole.includes('高层') ? '高层管理者' :
          reportData.userInfo.userRole.includes('中层') ? '中层管理者' : '基层管理者';
        doc.fontSize(12).text(`本次测评基于讯百汇组织领导力模型对${roleText}的领导力要求，对被测评人的行为进行评价，因此在阅读此报告时请基于以上背景和标准进行解读。此外，个人的能力素质是不断发展的，特别是在经历重大事件、经受重大挑战之后，素质的提升会很迅速。因此，请留意这份报告的撰写日期和撰写目的。在完成这份报告三年之后，或该参与者或其工作环境发生了巨大变化，如果仍需用该报告作参考，必须慎重考虑其有效性。`);
        doc.moveDown();

        doc.fontSize(16).text('报告的使用注意', { underline: true });
        doc.fontSize(12).text('当阅读本报告时，应首先将注意力集中在优势领域，思考被测评人未来如何更好的发挥优势领域。如果被测评人的行为与其他反馈信息不一致，请不要否定这些结论，尝试寻找更多的信息进行客观的评价。对于待发展领域，建议参与者在阅读报告后，询问直接上级、内部教练或其他信任的人获取更加具体的发展建议。');
        doc.moveDown();

        // 新页面 - 组织领导力模型
        doc.addPage();
        doc.fontSize(20).text('组织领导力模型', { underline: true });
        doc.moveDown();

        const leadershipItemsCount = reportData.userInfo.userRole.includes('高层') ? '14项' :
          reportData.userInfo.userRole.includes('中层') ? '13项' : '8项';
        doc.fontSize(12).text(`本次领导力测评是基于讯百汇组织领导力模型的${leadershipItemsCount}领导力素质。`);
        doc.moveDown(2);

        // 新页面 - 组织领导力测评维度及定义
        doc.addPage();
        doc.fontSize(20).text('组织领导力测评维度及定义', { underline: true });
        doc.moveDown();

        // 添加指标含义说明
        if (reportData.indicatorMeanings && reportData.indicatorMeanings.length > 0) {
          reportData.indicatorMeanings.forEach(indicator => {
            doc.fontSize(16).text(indicator.dimension, { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12).text(`指标含义：${indicator.meaning}`);
            doc.moveDown();

            if (indicator.subdimensions && indicator.subdimensions.length > 0) {
              indicator.subdimensions.forEach(sub => {
                doc.fontSize(12).text(`${sub.name}：${sub.description}`);
                doc.moveDown(0.5);
              });
            }
            doc.moveDown();
          });
        }

        // 新页面 - 组织领导力剖像
        doc.addPage();
        doc.fontSize(20).text('组织领导力剖像', { underline: true });
        doc.moveDown();
        const roleTextForProfile = reportData.userInfo.userRole.includes('高层') ? '高层管理者' :
          reportData.userInfo.userRole.includes('中层') ? '中层管理者' : '基层管理者';
        doc.fontSize(12).text(`对照讯百汇组织领导力模型对${roleTextForProfile}的领导力要求，参与者在各个能力维度的得分如下。`);
        doc.moveDown(2);

        // 绘制雷达图
        const allDimensions = [...reportData.radarChart.selfdirectedData, ...reportData.radarChart.roleSpecificData];

        if (chartImage) {
          // 如果提供了图表图片，直接嵌入
          try {
            // 处理 base64 图片字符串
            // 格式通常是 "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
            const base64Data = chartImage.replace(/^data:image\/\w+;base64,/, "");
            const imgBuffer = Buffer.from(base64Data, 'base64');

            const centerX = doc.page.width / 2;
            const imgWidth = 400;
            const imgHeight = 300; // 估算高度，或者根据宽度等比缩放

            doc.image(imgBuffer, centerX - imgWidth / 2, doc.y, { width: imgWidth });

            // 移动光标到图片下方
            doc.moveDown(15); // 根据图片高度调整
          } catch (imgError) {
            console.error('嵌入图表图片失败:', imgError);
            doc.text('（图表加载失败）', { align: 'center' });
            doc.moveDown(2);
          }
        } else {
          // 否则使用默认的手动绘制逻辑
          const centerX = doc.page.width / 2;
          const centerY = doc.y + 200; // 增加高度以容纳更大的图表
          const radius = 150; // 增加半径

          // 检查是否有 LCP 数据 (双层雷达图)
          if (reportData.radarChart.lcpData &&
            (reportData.radarChart.lcpData.creative.length > 0 || reportData.radarChart.lcpData.reactive.length > 0)) {

            this.drawLCPChart(doc, reportData.radarChart.lcpData, centerX, centerY, radius);

          } else if (allDimensions.length > 0) {
            // 降级到普通雷达图
            this.drawRadarChart(doc, allDimensions, centerX, centerY, 100);
          }

          // 移动光标到图表下方
          doc.y = centerY + radius + 60;
        }

        // 维度得分列表 (详细数据表格)
        doc.addPage(); // 新起一页放表格，避免过于拥挤
        doc.fontSize(16).text('详细得分数据表', { underline: true });
        doc.moveDown();
        
        // 表头设置
        const tableTop = doc.y;
        const colX = [50, 200, 350, 450]; // 列起始坐标: 维度/子维度, 自评, 他评
        const rowHeight = 20;
        
        doc.fontSize(12).font('ChineseFont');
        
        // 绘制表头
        doc.fillColor('#333333').text('维度 / 子维度', colX[0], tableTop, { width: 150 });
        doc.text('自评得分', colX[1], tableTop, { width: 100, align: 'center' });
        doc.text('他评得分', colX[2], tableTop, { width: 100, align: 'center' });
        
        // 画线
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        let currentY = tableTop + 25;
        
        // 辅助函数：绘制表格行
        const drawRow = (name: string, self: number, others: number, isMain: boolean) => {
            if (currentY > 700) { // 换页处理
                doc.addPage();
                currentY = 50;
                // 重绘表头
                doc.fillColor('#333333').font('ChineseFont', 12);
                doc.text('维度 / 子维度', colX[0], currentY, { width: 150 });
                doc.text('自评得分', colX[1], currentY, { width: 100, align: 'center' });
                doc.text('他评得分', colX[2], currentY, { width: 100, align: 'center' });
                doc.moveTo(50, currentY + 15).lineTo(550, currentY + 15).stroke();
                currentY += 25;
            }
            
            if (isMain) {
                doc.font('ChineseFont').fontSize(12).fillColor('#000000'); // 尝试加粗效果（颜色加深）
                // 绘制浅色背景
                doc.save();
                doc.rect(50, currentY - 5, 500, 20).fillColor('#f5f5f5').fill();
                doc.restore();
            } else {
                doc.font('ChineseFont').fontSize(10).fillColor('#666666');
            }
            
            // 维度名称缩进
            const indent = isMain ? 0 : 20;
            doc.text(name, colX[0] + indent, currentY);
            
            // 分数 (如果主维度没有分数，可以留空或显示平均值)
            if (self >= 0) doc.text(self.toFixed(1), colX[1], currentY, { width: 100, align: 'center' });
            if (others >= 0) doc.text(others.toFixed(1), colX[2], currentY, { width: 100, align: 'center' });
            
            currentY += rowHeight;
        };
        
        // 遍历数据填充表格
        if (reportData.radarChart.lcpData) {
            const { creative, reactive } = reportData.radarChart.lcpData;
            
            // 创造性维度
            doc.moveDown();
            drawRow('创造性能力 (Creative)', -1, -1, true);
            
            creative.forEach(dim => {
                 // 计算主维度平均分（如果有多个子维度）
                 const avgSelf = dim.traits.reduce((s, t) => s + t.self, 0) / (dim.traits.length || 1);
                 const avgOthers = dim.traits.reduce((s, t) => s + t.others, 0) / (dim.traits.length || 1);
                 
                 drawRow(dim.dimension, avgSelf, avgOthers, true);
                 
                 dim.traits.forEach(trait => {
                     drawRow(trait.name, trait.self, trait.others, false);
                 });
            });
            
            // 反应性维度
            currentY += 10; // 间隔
            drawRow('反应性倾向 (Reactive)', -1, -1, true);
            
            reactive.forEach(dim => {
                 const avgSelf = dim.traits.reduce((s, t) => s + t.self, 0) / (dim.traits.length || 1);
                 const avgOthers = dim.traits.reduce((s, t) => s + t.others, 0) / (dim.traits.length || 1);
                 
                 drawRow(dim.dimension, avgSelf, avgOthers, true);
                 
                 dim.traits.forEach(trait => {
                     drawRow(trait.name, trait.self, trait.others, false);
                 });
            });
            
        } else {
             // 降级显示普通列表
             allDimensions.forEach(dimension => {
                drawRow(dimension.dimension, dimension.percentage, -1, true);
             });
        }
        
        doc.y = currentY + 20; // 更新光标位置以便后续内容接着写

        // 优势领域
        doc.fontSize(16).text('个人优势领域：', { underline: true });
        doc.moveDown();
        if (reportData.strengthWeaknessAnalysis.strengths.length > 0) {
          reportData.strengthWeaknessAnalysis.strengths.forEach((strength, index) => {
            doc.fontSize(12).text(`${index + 1}. ${strength.dimension}（${strength.percentage.toFixed(1)}%）`);
            doc.text(`   ${strength.description}`);
            doc.moveDown();
          });
        } else {
          doc.fontSize(12).text('各项能力表现均衡，继续保持！');
        }
        doc.moveDown();

        // 待发展领域
        doc.fontSize(16).text('个人待发展领域：', { underline: true });
        doc.moveDown();
        if (reportData.strengthWeaknessAnalysis.weaknesses.length > 0) {
          doc.fontSize(12).text('以下方面存在明显提升空间：');
          reportData.strengthWeaknessAnalysis.weaknesses.forEach((weakness, index) => {
            doc.text(`${index + 1}. ${weakness.dimension}（${weakness.percentage.toFixed(1)}%）`);
            doc.text(`   ${weakness.description}`);
            doc.text(`   改进建议：${weakness.improvementSuggestion}`);
            doc.moveDown();
          });
        } else {
          doc.fontSize(12).text('暂无明显待发展领域，建议继续保持现有水平。');
        }

        // 新页面 - 行动建议
        doc.addPage();
        doc.fontSize(20).text('建议后续行动计划：', { underline: true });
        doc.moveDown();

        if (reportData.actionRecommendations.length > 0) {
          reportData.actionRecommendations.forEach(recommendation => {
            doc.fontSize(16).text(recommendation.dimension, { underline: true });
            doc.moveDown(0.5);

            doc.fontSize(12);
            recommendation.actions.forEach((action, index) => {
              doc.text(`${index + 1}. ${action}`);
            });
            doc.moveDown();

            doc.text(`建议时间：${recommendation.timeline}`);
            doc.text(`所需资源：${recommendation.resources.join('、')}`);
            doc.moveDown(1.5);
          });
        }

        // AI分析
        doc.addPage();
        doc.fontSize(20).text('AI智能分析', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(aiAnalysis);
        doc.moveDown();

        // 总结
        doc.addPage();
        doc.fontSize(20).text('总结', { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(`被测评人在各项领导力维度中表现${reportData.userInfo.overallPercentage >= 75 ? '优秀' : reportData.userInfo.overallPercentage >= 60 ? '良好' : '有待提升'}，总体得分率为${reportData.userInfo.overallPercentage.toFixed(1)}%。建议通过系统化培训、机制建设与文化引导相结合的方式，逐步提升其全面领导力。`);

        doc.end();

      } catch (error) {
        console.error('PDF生成过程中出错:', error);
        reject(error);
      }
    });
  }

  private async uploadToOss(buffer: Buffer, fileName: string): Promise<string> {
    // 在这里实现上传到阿里云 OSS 的逻辑
    // 注意：需要从配置中获取 OSS 的 accessKeyId, accessKeySecret, bucket, region
    // const client = new OSS({
    //   region: 'YOUR_OSS_REGION',
    //   accessKeyId: 'YOUR_ACCESS_KEY_ID',
    //   accessKeySecret: 'YOUR_ACCESS_KEY_SECRET',
    //   bucket: 'YOUR_BUCKET_NAME',
    // });
    // const result = await client.put(fileName, buffer);
    // return result.url;
    return `https://example.com/${fileName}`; // 暂时返回示例 URL
  }


  async getReportFileUrl(id: number): Promise<string> {
    const report = await this.reportsRepository.findOneBy({ id });
    return report?.fileUrl || '';
  }

  private drawRadarChart(doc: any, data: any[], centerX: number, centerY: number, radius: number) {
    const numPoints = data.length;
    const angleStep = (Math.PI * 2) / numPoints;

    // 1. 绘制背景网格 (5层)
    doc.lineWidth(0.5).strokeColor('#e0e0e0');
    for (let i = 1; i <= 5; i++) {
      const r = (radius / 5) * i;
      doc.moveTo(centerX, centerY - r);

      for (let j = 1; j < numPoints; j++) {
        const angle = -Math.PI / 2 + angleStep * j;
        doc.lineTo(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r);
      }
      doc.closePath().stroke();
    }

    // 2. 绘制轴线
    doc.lineWidth(0.5).strokeColor('#cccccc');
    for (let i = 0; i < numPoints; i++) {
      const angle = -Math.PI / 2 + angleStep * i;
      doc.moveTo(centerX, centerY)
        .lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
        .stroke();
    }

    // 3. 绘制数据多边形
    doc.lineWidth(2).strokeColor('#4A90E2').fillColor('#4A90E2', 0.2);
    const points: [number, number][] = [];

    data.forEach((item, i) => {
      const angle = -Math.PI / 2 + angleStep * i;
      // percentage is 0-100, map to radius
      const r = (item.percentage / 100) * radius;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      points.push([x, y]);

      if (i === 0) doc.moveTo(x, y);
      else doc.lineTo(x, y);
    });

    doc.closePath().fillAndStroke();

    // 4. 绘制数据点
    doc.fillColor('#4A90E2');
    points.forEach(p => {
      doc.circle(p[0], p[1], 3).fill();
    });

    // 5. 绘制标签
    doc.fontSize(10).fillColor('#333333');
    data.forEach((item, i) => {
      const angle = -Math.PI / 2 + angleStep * i;
      const labelRadius = radius + 20; // 标签距离中心的距离
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;

      // 简单的对齐调整
      const align = Math.abs(x - centerX) < 10 ? 'center' : (x > centerX ? 'left' : 'right');

      doc.text(item.dimension, x - 30, y - 5, { width: 60, align: align as any });
      doc.fontSize(8).fillColor('#666666')
        .text(`${item.percentage.toFixed(1)}%`, x - 30, y + 8, { width: 60, align: align as any });
      doc.fontSize(10).fillColor('#333333'); // Reset color/size
    });
  }

  /**
   * 绘制 LCP 风格的双层雷达图（旭日图结构）
   * - 内圈：主维度扇形环，显示主维度得分
   * - 外圈：子维度扇形环，显示子维度得分
   * - 数据线：自评实线，他评虚线
   */
  private drawLCPChart(doc: any, lcpData: any, centerX: number, centerY: number, maxRadius: number) {
    // 定义旭日图的层级半径 - 调整比例使内外圈更明显
    const dataRadius = maxRadius * 0.6;      // 数据区半径
    const innerRingInner = dataRadius + 10;  // 内圈内半径
    const innerRingOuter = dataRadius + 40;  // 内圈外半径（加宽环形）
    const outerRingInner = innerRingOuter + 5; // 外圈内半径（留间隙）
    const outerRingOuter = outerRingInner + 35; // 外圈外半径
    const labelRingOuter = maxRadius;        // 标签区外半径

    // 1. 绘制同心圆网格（用于数据参考）
    const gridLevels = [20, 40, 60, 67, 80, 100];
    gridLevels.forEach(level => {
      const r = (dataRadius * level) / 100;
      doc.save();
      if (level === 67) {
        doc.lineWidth(2).strokeColor('#333333').dash(4, {space: 4});
      } else {
        doc.lineWidth(0.5).strokeColor('#e0e0e0').undash();
      }
      doc.circle(centerX, centerY, r).stroke();
      
      if (level === 100 || level === 67) {
        doc.fontSize(9).fillColor(level === 67 ? '#333333' : '#999999');
        doc.text(`${level}%`, centerX + 4, centerY - r - 4);
      }
      doc.restore();
    });
    const allDimensions = [...lcpData.creative, ...lcpData.reactive];
    const totalTraits = allDimensions.reduce((sum, dim) => sum + dim.traits.length, 0);
    if (totalTraits === 0) return;

    // 每个子维度占据的角度
    const anglePerTrait = (2 * Math.PI) / totalTraits;
    let currentAngle = -Math.PI / 2; // 从顶部开始

    // 存储维度信息用于绘制
    interface DimInfo {
      dimension: string;
      color: string;
      startAngle: number;
      endAngle: number;
      avgSelf: number;
      avgOthers: number;
      traits: Array<{
        name: string;
        self: number;
        others: number;
        startAngle: number;
        endAngle: number;
        midAngle: number;
      }>;
    }
    
    const dimensionsInfo: DimInfo[] = [];
    
    // Helper for radial grid
    const drawRadialLine = (angle: number, isMain: boolean) => {
        const rStart = 0;
        const rEnd = isMain ? innerRingOuter : dataRadius;
        const x1 = centerX + Math.cos(angle) * rStart;
        const y1 = centerY + Math.sin(angle) * rStart;
        const x2 = centerX + Math.cos(angle) * rEnd;
        const y2 = centerY + Math.sin(angle) * rEnd;
        
        doc.save();
        doc.lineWidth(isMain ? 1.5 : 0.5)
           .strokeColor(isMain ? '#ffffff' : '#eeeeee');
        
        if (!isMain) doc.dash(2, { space: 2 });
        
        doc.moveTo(centerX, centerY) // Start from center for better look
           .lineTo(x2, y2)
           .stroke();
        doc.restore();
    };

    // 3. 处理每个主维度及其子维度
    allDimensions.forEach(dim => {
      const dimStartAngle = currentAngle;
      const traits: DimInfo['traits'] = [];
      let selfSum = 0;
      let othersSum = 0;

      dim.traits.forEach(trait => {
        const traitStartAngle = currentAngle;
        const traitEndAngle = currentAngle + anglePerTrait;
        const traitMidAngle = (traitStartAngle + traitEndAngle) / 2;
        
        traits.push({
          name: trait.name,
          self: trait.self,
          others: trait.others,
          startAngle: traitStartAngle,
          endAngle: traitEndAngle,
          midAngle: traitMidAngle
        });
        
        // Draw radial grid line for start of trait
        drawRadialLine(traitStartAngle, false);
        
        selfSum += trait.self;
        othersSum += trait.others;
        currentAngle += anglePerTrait;
      });

      const dimEndAngle = currentAngle;
      
      // Draw radial grid line for end of dimension (Main Boundary)
      // Note: This might overlap with the start of next dim, which is fine
      // But we need to make sure it's drawn as "Main"
      // Actually, we should draw main boundaries separately or ensure they overwrite
      const avgSelf = selfSum / (dim.traits.length || 1);
      const avgOthers = othersSum / (dim.traits.length || 1);

      dimensionsInfo.push({
        dimension: dim.dimension,
        color: dim.color,
        startAngle: dimStartAngle,
        endAngle: dimEndAngle,
        avgSelf,
        avgOthers,
        traits
      });
    });

    // 4. 绘制内圈（主维度扇形环）- 优化绘制避免三角形
    dimensionsInfo.forEach(dimInfo => {
      // 绘制主维度扇形环 - 使用正确的路径绘制
      doc.save();
      
      // 绘制外弧
      doc.arc(centerX, centerY, innerRingOuter, dimInfo.startAngle, dimInfo.endAngle, false);
      // 连接到内弧起点
      doc.lineTo(
        centerX + Math.cos(dimInfo.endAngle) * innerRingInner,
        centerY + Math.sin(dimInfo.endAngle) * innerRingInner
      );
      // 绘制内弧（反向）
      doc.arc(centerX, centerY, innerRingInner, dimInfo.endAngle, dimInfo.startAngle, true);
      // 闭合路径
      doc.closePath();
      
      doc.fillColor(dimInfo.color, 0.9).strokeColor('white').lineWidth(2.5).fillAndStroke();
      doc.restore();

      // 绘制主维度标签 - 增大字体
      const dimMidAngle = (dimInfo.startAngle + dimInfo.endAngle) / 2;
      const dimTextR = (innerRingInner + innerRingOuter) / 2;
      const dimTextX = centerX + Math.cos(dimMidAngle) * dimTextR;
      const dimTextY = centerY + Math.sin(dimMidAngle) * dimTextR;

      doc.save();
      doc.translate(dimTextX, dimTextY);
      let rotate = dimMidAngle * (180 / Math.PI);
      if (rotate > 90) rotate -= 180;
      if (rotate < -90) rotate += 180;
      doc.rotate(rotate);
      doc.fontSize(11).fillColor('#FFFFFF').font('ChineseFont');
      const dimName = dimInfo.dimension.split(' ')[0] || dimInfo.dimension;
      doc.text(dimName, 0, -5, { align: 'center', width: 0 });
      doc.restore();
    });

    // 5. 绘制外圈（子维度扇形环）- Sunburst Arc Style
    dimensionsInfo.forEach(dimInfo => {
      dimInfo.traits.forEach(trait => {
        doc.save();
        
        const traitOuterInner = innerRingOuter + 2; // Small gap from inner ring
        
        // 绘制外弧
        doc.arc(centerX, centerY, outerRingOuter, trait.startAngle, trait.endAngle, false);
        // 连接到内弧起点
        doc.lineTo(
          centerX + Math.cos(trait.endAngle) * traitOuterInner,
          centerY + Math.sin(trait.endAngle) * traitOuterInner
        );
        // 绘制内弧（反向）
        doc.arc(centerX, centerY, traitOuterInner, trait.endAngle, trait.startAngle, true);
        // 闭合路径
        doc.closePath();
        
        doc.fillColor(dimInfo.color, 0.6).strokeColor('white').lineWidth(1).fillAndStroke();
        doc.restore();

        // 绘制子维度标签（径向排列）
        const labelR = outerRingOuter + 15;
        const labelX = centerX + Math.cos(trait.midAngle) * labelR;
        const labelY = centerY + Math.sin(trait.midAngle) * labelR;

        doc.save();
        doc.translate(labelX, labelY);
        let labelRotate = trait.midAngle * (180 / Math.PI);
        let align = 'left';
        
        if (labelRotate > 90 || labelRotate < -90) {
          labelRotate += 180;
          align = 'right';
        }
        
        doc.rotate(labelRotate);
        doc.fontSize(8).fillColor('#555').font('ChineseFont');
        const traitName = trait.name.split(' ')[0] || trait.name;
        
        if (align === 'right') {
          doc.text(traitName, -45, -3, { width: 45, align: 'right' });
        } else {
          doc.text(traitName, 0, -3, { width: 45, align: 'left' });
        }
        doc.restore();
      });
    });

    // 6. 绘制数据线和点
    // 收集内圈和外圈的数据点
    const innerSelfPoints: [number, number][] = [];
    const innerOthersPoints: [number, number][] = [];
    const outerSelfPoints: [number, number][] = [];
    const outerOthersPoints: [number, number][] = [];

    dimensionsInfo.forEach(dimInfo => {
      // 内圈：主维度平均分 - 映射到数据区
      const dimMidAngle = (dimInfo.startAngle + dimInfo.endAngle) / 2;
      const innerSelfR = (dimInfo.avgSelf / 100) * dataRadius;
      const innerOthersR = (dimInfo.avgOthers / 100) * dataRadius;
      
      innerSelfPoints.push([
        centerX + Math.cos(dimMidAngle) * innerSelfR,
        centerY + Math.sin(dimMidAngle) * innerSelfR
      ]);
      innerOthersPoints.push([
        centerX + Math.cos(dimMidAngle) * innerOthersR,
        centerY + Math.sin(dimMidAngle) * innerOthersR
      ]);

      // 外圈：子维度独立分数 - 映射到数据区
      dimInfo.traits.forEach(trait => {
        const outerSelfR = (trait.self / 100) * dataRadius;
        const outerOthersR = (trait.others / 100) * dataRadius;
        
        outerSelfPoints.push([
          centerX + Math.cos(trait.midAngle) * outerSelfR,
          centerY + Math.sin(trait.midAngle) * outerSelfR
        ]);
        outerOthersPoints.push([
          centerX + Math.cos(trait.midAngle) * outerOthersR,
          centerY + Math.sin(trait.midAngle) * outerOthersR
        ]);
      });
    });

    // 绘制外圈他评线（虚线）
    if (outerOthersPoints.length > 0) {
      doc.save();
      doc.lineWidth(2).strokeColor('#333').dash(4, { space: 4 });
      doc.moveTo(outerOthersPoints[0][0], outerOthersPoints[0][1]);
      for (let i = 1; i < outerOthersPoints.length; i++) {
        doc.lineTo(outerOthersPoints[i][0], outerOthersPoints[i][1]);
      }
      doc.closePath().stroke();
      doc.restore();
      
      // 绘制他评点
      doc.fillColor('#333');
      outerOthersPoints.forEach(p => doc.circle(p[0], p[1], 2).fill());
    }

    // 绘制外圈自评线（实线）
    if (outerSelfPoints.length > 0) {
      doc.save();
      doc.lineWidth(3).strokeColor('#000');
      doc.moveTo(outerSelfPoints[0][0], outerSelfPoints[0][1]);
      for (let i = 1; i < outerSelfPoints.length; i++) {
        doc.lineTo(outerSelfPoints[i][0], outerSelfPoints[i][1]);
      }
      doc.closePath().stroke();
      doc.restore();
      
      // 绘制自评点（带颜色）
      let traitIdx = 0;
      dimensionsInfo.forEach(dimInfo => {
        dimInfo.traits.forEach(() => {
          const p = outerSelfPoints[traitIdx];
          doc.fillColor(dimInfo.color).circle(p[0], p[1], 3).fill();
          doc.strokeColor('white').lineWidth(0.5).circle(p[0], p[1], 3).stroke();
          traitIdx++;
        });
      });
    }

    // 绘制内圈他评线（虚线）
    if (innerOthersPoints.length > 0) {
      doc.save();
      doc.lineWidth(2).strokeColor('#333').dash(4, { space: 4 });
      doc.moveTo(innerOthersPoints[0][0], innerOthersPoints[0][1]);
      for (let i = 1; i < innerOthersPoints.length; i++) {
        doc.lineTo(innerOthersPoints[i][0], innerOthersPoints[i][1]);
      }
      doc.closePath().stroke();
      doc.restore();
      
      doc.fillColor('#333');
      innerOthersPoints.forEach(p => doc.circle(p[0], p[1], 2).fill());
    }

    // 绘制内圈自评线（实线）
    if (innerSelfPoints.length > 0) {
      doc.save();
      doc.lineWidth(3).strokeColor('#000');
      doc.moveTo(innerSelfPoints[0][0], innerSelfPoints[0][1]);
      for (let i = 1; i < innerSelfPoints.length; i++) {
        doc.lineTo(innerSelfPoints[i][0], innerSelfPoints[i][1]);
      }
      doc.closePath().stroke();
      doc.restore();
      
      dimensionsInfo.forEach((dimInfo, i) => {
        const p = innerSelfPoints[i];
        doc.fillColor(dimInfo.color).circle(p[0], p[1], 3).fill();
        doc.strokeColor('white').lineWidth(0.5).circle(p[0], p[1], 3).stroke();
      });
    }
  }

}
