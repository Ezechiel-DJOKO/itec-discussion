import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AppPermission {
  CAN_CREATE_PROJECT = 'can_create_project',
  CAN_VIEW_STATS = 'can_view_stats',
  CAN_ACCESS_QG = 'can_access_qg', // 👈 NOUVEAU
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column()
  motDePasse: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: true })
  actif: boolean; // Si false, l'utilisateur est temporairement désactivé

  // 🔴 NOUVEAUTÉ : SUPER ADMIN ET PERMISSIONS
  @Column({ default: false })
  isSuperAdmin: boolean;

  @Column({
    type: 'enum',
    enum: AppPermission,
    array: true,
    default: [],
  })
  permissions: AppPermission[];

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;
}