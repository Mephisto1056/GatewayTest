import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EvaluationResponse } from './evaluation-response.entity';
import { EvaluationParticipant } from './evaluation-participant.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'questionnaire_type', nullable: true })
  questionnaireType: string;

  @Column()
  status: string;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => EvaluationResponse, response => response.evaluation)
  responses: EvaluationResponse[];

  @OneToMany(() => EvaluationParticipant, participant => participant.evaluation)
  participants: EvaluationParticipant[];
}
