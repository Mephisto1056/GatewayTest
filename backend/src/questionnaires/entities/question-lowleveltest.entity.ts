import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('question_lowleveltest')
export class QuestionLowleveltest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_level', comment: '用户层级' })
  userLevel: string;

  @Column({ name: 'evaluation_dimension', comment: '测评维度' })
  evaluationDimension: string;

  @Column({ name: 'indicator_meaning', type: 'text', comment: '指标含义' })
  indicatorMeaning: string;

  @Column({ name: 'evaluation_sub_dimension', comment: '测评子维度' })
  evaluationSubDimension: string;

  @Column({ name: 'question_code', comment: '问题编号' })
  questionCode: string;

  @Column({ name: 'question_text', type: 'text', comment: '问题内容' })
  questionText: string;

  @Column({ name: 'relevance', nullable: true, comment: '相关性' })
  relevance?: string;

  @Column({ name: 'scoring_rule', nullable: true, comment: '计分规则' })
  scoringRule?: string;
}