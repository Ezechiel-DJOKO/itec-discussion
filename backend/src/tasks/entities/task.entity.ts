import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import type { Project } from '../../projects/entities/project.entity.js';

export enum TaskStatut {
  A_FAIRE = 'a_faire',
  EN_COURS = 'en_cours',
  EN_ATTENTE = 'en_attente',
  TERMINE = 'termine',
}

export enum TaskPriorite {
  HAUTE = 'haute',
  MOYENNE = 'moyenne',
  BASSE = 'basse',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  readme: string;

  @Column({
    type: 'enum',
    enum: TaskStatut,
    default: TaskStatut.A_FAIRE,
  })
  statut: TaskStatut;

  @Column({
    type: 'enum',
    enum: TaskPriorite,
    default: TaskPriorite.MOYENNE,
  })
  priorite: TaskPriorite;

  @Column({ type: 'date' })
  dateLimite: string;

  // Date limite initiale (pour tracer les surplus plus tard)
  @Column({ type: 'date' })
  dateLimiteInitiale: string;

  @Column({ type: 'int', default: 0 })
  joursSurplus: number;

  // Projet parent
  @ManyToOne('Project', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  // Responsable assigné
  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'assigne_a' })
  assigneA: User | null;

  @Column({ name: 'assigne_a', nullable: true })
  assigneAId: string | null;

  // Qui a créé la tâche
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;

  
  
}

 