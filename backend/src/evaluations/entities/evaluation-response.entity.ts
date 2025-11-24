import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Evaluation } from './evaluation.entity';
import { User } from '../../users/entities/user.entity';

@Entity('evaluation_responses')
export class EvaluationResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'evaluation_id' })
  evaluationId: number;

  @Column({ name: 'respondent_id' })
  respondentId: number;

  @Column({ name: 'question_code', comment: '问题编号' })
  questionCode: string;

  @Column()
  score: number;

  @Column({ name: 'open_text', type: 'text', nullable: true })
  openText: string;

  @Column()
  relationship: string;

  @ManyToOne(() => Evaluation, evaluation => evaluation.responses)
  @JoinColumn({ name: 'evaluation_id' })
  evaluation: Evaluation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'respondent_id' })
  respondent: User;
}