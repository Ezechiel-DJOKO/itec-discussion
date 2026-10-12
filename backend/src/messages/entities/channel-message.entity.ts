import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum ChannelType {
  GLOBAL = 'global',
  RESPONSABLES = 'responsables',
}

@Entity('channel_messages')
export class ChannelMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ChannelType })
  channel: ChannelType;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;
}