import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Evaluation } from './evaluation.entity';
import { User } from '../../users/entities/user.entity';

export enum ParticipantStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Entity('evaluation_participants')
export class EvaluationParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'evaluation_id' })
  evaluationId: number;

  @Column({ name: 'participant_id' })
  participantId: number;

  @Column()
  relationship: string; // e.g., '上级', '平级', '下级'

  @Column({
    default: ParticipantStatus.PENDING,
  })
  status: ParticipantStatus;

  @ManyToOne(() => Evaluation, evaluation => evaluation.participants)
  @JoinColumn({ name: 'evaluation_id' })
  evaluation: Evaluation;

  @ManyToOne(() => User, user => user.participations)
  @JoinColumn({ name: 'participant_id' })
  participant: User;
}
