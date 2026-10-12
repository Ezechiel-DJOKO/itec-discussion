import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum ActionType {
  STATUT_MODIFIE = 'statut_modifie',
  SURPLUS_ACCORDE = 'surplus_accorde',
  FICHIER_UPLOADE = 'fichier_uploade',
}

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: ActionType })
  action: ActionType;

  // On stocke les détails en JSON (ex: { nomTache: "Faire l'API", ancien: "a_faire", nouveau: "en_cours" })
  @Column({ type: 'json' })
  details: any;

  @CreateDateColumn()
  creeLe: Date;
}