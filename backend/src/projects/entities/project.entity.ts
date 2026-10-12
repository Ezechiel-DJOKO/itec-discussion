import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import type { ProjectMember } from './project-member.entity.js';

export enum ProjectStatut {
  EN_COURS = 'en_cours',
  TERMINE = 'termine',
  ARCHIVE = 'archive',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  dateDebut: string;

  @Column({ type: 'date' })
  dateFin: string;

  @Column({
    type: 'enum',
    enum: ProjectStatut,
    default: ProjectStatut.EN_COURS,
  })
  statut: ProjectStatut;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @OneToMany('ProjectMember', 'project', {
    cascade: true,
    eager: true,
  })
  membres: ProjectMember[];

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;
}