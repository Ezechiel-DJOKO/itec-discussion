import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string; // À qui est destinée la notif

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  lu: boolean;

  @CreateDateColumn()
  creeLe: Date;
}