export interface User {
  id: string;
  nom: string;
  email: string;
  avatar?: string;
  role?: 'admin' | 'responsable' | 'membre' | string;
  prenom?: string;
  isResponsable?: boolean;
}

export interface ProjectMember {
  id: string;
  userId: string;
  role: 'chef' | 'membre';
  user: User;
  ajouteLe: string;
}

export interface Project {
  id: string;
  nom: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  statut: 'en_cours' | 'termine' | 'archive';
  createur: User;
  createdById: string;
  membres: ProjectMember[];
  creeLe: string;
  modifieLe: string;
}

export type TaskStatut = 'a_faire' | 'en_cours' | 'en_attente' | 'termine';
export type TaskPriorite = 'haute' | 'moyenne' | 'basse';

export interface Task {
  id: string;
  titre: string;
  description?: string;
  readme?: string;
  statut: TaskStatut;
  priorite: TaskPriorite;
  dateLimite: string;
  dateLimiteInitiale: string;
  joursSurplus: number;
  projectId: string;
  assignes: User[];
  assigneA: User | null;
  assigneAId: string | null;
  createur: User;
  createdById: string;
  creeLe: string;
  modifieLe: string;
}

export interface TaskFile {
  id: string;
  nomOriginal: string;
  nomStockage: string;
  mimetype: string;
  taille: number;
  chemin: string;
  taskId: string;
  uploadedBy: User;
  uploadedById: string;
  uploadedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  lu: boolean;
  creeLe: string;
}

export type ActionType = 'statut_modifie' | 'surplus_accorde' | 'fichier_uploade';

export interface ActivityLog {
  id: string;
  projectId: string;
  user: User;
  userId: string;
  action: ActionType;
  details: any;
  creeLe: string;
}