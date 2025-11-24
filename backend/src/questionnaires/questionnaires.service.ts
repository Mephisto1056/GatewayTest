import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionSelfdirected } from './entities/question-selfdirected.entity';
import { QuestionHighleveltest } from './entities/question-highleveltest.entity';
import { QuestionMediumleveltest } from './entities/question-mediumleveltest.entity';
import { QuestionLowleveltest } from './entities/question-lowleveltest.entity';

@Injectable()
export class QuestionnairesService {
  constructor(
    @InjectRepository(QuestionSelfdirected)
    private questionSelfdirectedRepository: Repository<QuestionSelfdirected>,
    @InjectRepository(QuestionHighleveltest)
    private questionHighleveltestRepository: Repository<QuestionHighleveltest>,
    @InjectRepository(QuestionMediumleveltest)
    private questionMediumleveltestRepository: Repository<QuestionMediumleveltest>,
    @InjectRepository(QuestionLowleveltest)
    private questionLowleveltestRepository: Repository<QuestionLowleveltest>,
  ) { }

  // 获取所有自主导向问题
  findAllSelfdirectedQuestions(): Promise<QuestionSelfdirected[]> {
    return this.questionSelfdirectedRepository.find();
  }

  // 根据测评维度获取自主导向问题
  findSelfdirectedQuestionsByDimension(dimension: string): Promise<QuestionSelfdirected[]> {
    return this.questionSelfdirectedRepository.find({
      where: { evaluationDimension: dimension },
    });
  }

  // 根据测评维度获取问题
  findQuestionsByDimension(evaluationDimension: string): Promise<QuestionSelfdirected[]> {
    return this.questionSelfdirectedRepository.find({
      where: { evaluationDimension },
    });
  }

  // 根据问题编号获取单个问题
  findQuestionByCode(questionCode: string): Promise<QuestionSelfdirected | null> {
    return this.questionSelfdirectedRepository.findOne({
      where: { questionCode },
    });
  }

  // 创建新问题
  createQuestion(questionData: Partial<QuestionSelfdirected>): Promise<QuestionSelfdirected> {
    const question = this.questionSelfdirectedRepository.create(questionData);
    return this.questionSelfdirectedRepository.save(question);
  }

  // 更新问题
  updateQuestion(id: number, questionData: Partial<QuestionSelfdirected>): Promise<QuestionSelfdirected> {
    return this.questionSelfdirectedRepository.save({ ...questionData, id });
  }

  // 删除问题
  async deleteQuestion(id: number): Promise<void> {
    await this.questionSelfdirectedRepository.delete(id);
  }

  async countTotal(): Promise<number> {
    const selfDirected = await this.questionSelfdirectedRepository.count();
    const highLevel = await this.questionHighleveltestRepository.count();
    const mediumLevel = await this.questionMediumleveltestRepository.count();
    const lowLevel = await this.questionLowleveltestRepository.count();
    return selfDirected + highLevel + mediumLevel + lowLevel;
  }

  // 创建高层问题
  createHighlevelQuestion(questionData: Partial<QuestionHighleveltest>): Promise<QuestionHighleveltest> {
    const question = this.questionHighleveltestRepository.create(questionData);
    return this.questionHighleveltestRepository.save(question);
  }

  // 创建中层问题
  createMediumlevelQuestion(questionData: Partial<QuestionMediumleveltest>): Promise<QuestionMediumleveltest> {
    const question = this.questionMediumleveltestRepository.create(questionData);
    return this.questionMediumleveltestRepository.save(question);
  }

  // 创建基层问题
  createLowlevelQuestion(questionData: Partial<QuestionLowleveltest>): Promise<QuestionLowleveltest> {
    const question = this.questionLowleveltestRepository.create(questionData);
    return this.questionLowleveltestRepository.save(question);
  }

  // 获取高层问题
  findAllHighlevelQuestions(): Promise<QuestionHighleveltest[]> {
    return this.questionHighleveltestRepository.find();
  }

  // 获取中层问题
  findAllMediumlevelQuestions(): Promise<QuestionMediumleveltest[]> {
    return this.questionMediumleveltestRepository.find();
  }

  // 获取基层问题
  findAllLowlevelQuestions(): Promise<QuestionLowleveltest[]> {
    return this.questionLowleveltestRepository.find();
  }

  // 根据用户角色获取对应的问卷
  async getQuestionnaireByUserRole(userRole: string): Promise<{
    selfdirected: QuestionSelfdirected[];
    roleSpecific: QuestionHighleveltest[] | QuestionMediumleveltest[] | QuestionLowleveltest[];
  }> {
    const selfdirected = await this.findAllSelfdirectedQuestions();

    let roleSpecific: QuestionHighleveltest[] | QuestionMediumleveltest[] | QuestionLowleveltest[] = [];

    switch (userRole.toLowerCase()) {
      case '高层领导者':
      case '总经理':
      case '总经理-1':
        roleSpecific = await this.findAllHighlevelQuestions();
        break;
      case '中层管理者':
      case '总经理-2':
        roleSpecific = await this.findAllMediumlevelQuestions();
        break;
      case '基层管理者':
      case '一线管理者':
        roleSpecific = await this.findAllLowlevelQuestions();
        break;
      default:
        throw new Error(`不支持的用户角色: ${userRole}`);
    }

    return {
      selfdirected,
      roleSpecific
    };
  }

  // 根据问题编号获取自主导向问题
  findSelfdirectedQuestionByCode(questionCode: string): Promise<QuestionSelfdirected | null> {
    return this.questionSelfdirectedRepository.findOne({
      where: { questionCode },
    });
  }

  // 根据问题编号获取高层问题
  findHighlevelQuestionByCode(questionCode: string): Promise<QuestionHighleveltest | null> {
    return this.questionHighleveltestRepository.findOne({
      where: { questionCode },
    });
  }

  // 根据问题编号获取中层问题
  findMediumlevelQuestionByCode(questionCode: string): Promise<QuestionMediumleveltest | null> {
    return this.questionMediumleveltestRepository.findOne({
      where: { questionCode },
    });
  }

  // 根据问题编号获取基层问题
  findLowlevelQuestionByCode(questionCode: string): Promise<QuestionLowleveltest | null> {
    return this.questionLowleveltestRepository.findOne({
      where: { questionCode },
    });
  }
}
