import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity.js';

@Entity('penalties')
export class Penalty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  // Celui qui reçoit la pénalité
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  // Le chef qui a donné la pénalité
  @Column({ name: 'chef_id' })
  chefId: string;

  @Column({ type: 'text' })
  motif: string;

  @Column({ type: 'int', default: 5 })
  pointsPerdus: number;

  @CreateDateColumn()
  creeLe: Date;
}