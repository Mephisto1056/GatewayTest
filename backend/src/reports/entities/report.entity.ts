import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column()
  type: string;

  @Column({ name: 'data_json', type: 'json' })
  dataJson: any;

  @Column({ name: 'ai_analysis', type: 'text', nullable: true })
  aiAnalysis: string;

  @Column({ name: 'file_url', nullable: true })
  fileUrl: string;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}