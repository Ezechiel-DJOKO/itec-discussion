import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import type { Task } from '../../tasks/entities/task.entity.js';

@Entity('task_files')
export class TaskFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nomOriginal: string; // nom du fichier côté client

  @Column()
  nomStockage: string; // nom unique sur le disque

  @Column()
  mimetype: string;

  @Column({ type: 'int' })
  taille: number; // en octets

  @Column()
  chemin: string; // chemin relatif

  @ManyToOne('Task', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by' })
  uploadedById: string;

  @CreateDateColumn()
  uploadedAt: Date;
}