import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppPermission, User } from './entities/user.entity.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Task, TaskStatut } from '../tasks/entities/task.entity.js';
import { Penalty } from './entities/penalty.entity.js';
import { UnauthorizedException } from '@nestjs/common';
import { UpdatePasswordDto } from './dto/update-password.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Penalty) private readonly penaltyRepo: Repository<Penalty>, // 👈
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>, // 👈
    private readonly notifService: NotificationsService, // 👈
  ) {}

    // Créer un utilisateur
  async create(nom: string, email: string, motDePasse: string): Promise<User> {
    const existe = await this.userRepo.findOne({ where: { email } });
    if (existe) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const hash = await bcrypt.hash(motDePasse, 10);
    
    // 🔴 Compter les utilisateurs : le premier devient Super Admin
    const count = await this.userRepo.count();
    const isSuperAdmin = count === 0;

    const user = this.userRepo.create({ 
      nom, 
      email, 
      motDePasse: hash,
      isSuperAdmin, // 👈 Ajouté
      // S'il est super admin, on peut lui donner toutes les permissions par défaut (optionnel, car isSuperAdmin l'emporte de toute façon)
    });
    
    return this.userRepo.save(user);
  }

  // Trouver par email (pour le login)
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  // Trouver par ID
  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  // Lister tous les utilisateurs (sans le mot de passe)
    async findAll(): Promise<Omit<User, 'motDePasse'>[]> {
    const users = await this.userRepo.find({
      select: {
        id: true,
        nom: true,
        email: true,
        avatar: true,
        actif: true,
        creeLe: true,
        modifieLe: true,
        isSuperAdmin: true, permissions: true,
      },
    });
    return users;
  }

  // Modifier un utilisateur
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.email && dto.email !== user.email) {
      const existe = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existe) throw new ConflictException('Cet email est déjà utilisé');
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  // Supprimer (désactiver) un utilisateur
  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    user.actif = false;
    await this.userRepo.save(user);
  }

    // 🔴 VRAIE SUPPRESSION DÉFINITIVE (Admin uniquement)
  async hardDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user.isSuperAdmin) {
      throw new ConflictException('Impossible de supprimer le Super Admin principal');
    }
    await this.userRepo.remove(user);
  }

  // 🔴 BASCULER L'ÉTAT ACTIF/INACTIF (Désactivation temporaire)
  async toggleActif(id: string): Promise<User> {
    const user = await this.findById(id);
    if (user.isSuperAdmin) {
      throw new ConflictException('Impossible de désactiver le Super Admin');
    }
    user.actif = !user.actif;
    return this.userRepo.save(user);
  }

  // 🔴 BASCULER UNE PERMISSION (Admin uniquement)
  async togglePermission(id: string, permission: AppPermission): Promise<User> {
    const user = await this.findById(id);
    if (!user.permissions) user.permissions = [];

    if (user.permissions.includes(permission)) {
      user.permissions = user.permissions.filter((p) => p !== permission);
    } else {
      user.permissions.push(permission);
    }

    return this.userRepo.save(user);
  }

    // ─── PÉNALITÉS ──────────────────────────────────────────
  async addPenalty(projectId: string, userId: string, chefId: string, motif: string): Promise<Penalty> {
    const penalty = this.penaltyRepo.create({
      projectId,
      userId,
      chefId,
      motif,
      pointsPerdus: 5,
    });
    const saved = await this.penaltyRepo.save(penalty);

    // Notifier l'utilisateur
    await this.notifService.create(
      userId, 
      `⚠️ PÉNALITÉ : Vous avez reçu une pénalité (-5%) pour le motif suivant : "${motif}".`
    );

    return saved; // 👈 On retourne directement l'objet enregistré !
  }

    // ─── CALCUL DU RENDEMENT ────────────────────────────────
  async getUserStats(userId: string) {
    const penalties = await this.penaltyRepo.find({ where: { userId }, order: { creeLe: 'DESC' } });
    
    // 🔴 ATTENTION: Avec l'assignation multiple qui arrive, on doit chercher dans la relation "assignes"
    // (On va modifier la relation Task juste après, on prépare le terrain)
        // 🟢 NOUVEAU CODE : TypeORM moderne utilise un objet pour les relations
    const tasks = await this.taskRepo.find({ 
      where: { assignes: { id: userId } }, 
      relations: { assignes: true } 
    });
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.statut === TaskStatut.TERMINE).length;
    
    const today = new Date().toISOString().split('T')[0];
    const lateTasks = tasks.filter(t => t.statut !== TaskStatut.TERMINE && t.dateLimite < today).length;

    // 🔴 NOUVEAU CALCUL (Démarre à 0% si rien n'est fait)
    let baseRendement = 0;
    if (totalTasks > 0) {
      baseRendement = (completedTasks / totalTasks) * 100;
    }

    // Malus
    let finalRendement = baseRendement - (penalties.length * 5) - (lateTasks * 5);
    
    // Garder entre 0% et 100%
    if (finalRendement < 0) finalRendement = 0;
    if (finalRendement > 100) finalRendement = 100;

    return {
      rendement: Math.round(finalRendement),
      totalTasks,
      completedTasks,
      lateTasks,
      penalties,
    };
  }

  // 🔴 NOUVEL IMPORT EN HAUT (s'il n'y est pas déjà) :


// 🔴 AJOUTE CETTE MÉTHODE DANS LA CLASSE :
  // ─── CHANGER LE MOT DE PASSE ───
  async updatePassword(userId: string, dto: UpdatePasswordDto): Promise<{ message: string }> {
    const user = await this.findById(userId);

    // Vérifier l'ancien mot de passe
    const isValid = await bcrypt.compare(dto.ancienMotDePasse, user.motDePasse);
    if (!isValid) {
      throw new UnauthorizedException('Ancien mot de passe incorrect');
    }

    // Hasher le nouveau mot de passe
    user.motDePasse = await bcrypt.hash(dto.nouveauMotDePasse, 10);
    await this.userRepo.save(user);

    return { message: 'Mot de passe mis à jour avec succès' };
  }
}