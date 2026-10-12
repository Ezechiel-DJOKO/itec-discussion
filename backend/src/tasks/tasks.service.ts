import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatut } from './entities/task.entity.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { ProjectMember, MemberRole } from '../projects/entities/project-member.entity.js';
import { UsersService } from '../users/users.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { ActionType } from '../activity-logs/entities/activity-log.entity.js';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    private readonly usersService: UsersService,
    private readonly notifService: NotificationsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}


  // ─── ACCORDER DU SURPLUS ──────────────────────────────
async addSurplus(taskId: string, jours: number, chefId: string): Promise<Task> {
  const task = await this.findOne(taskId, chefId);
  await this.assertIsChef(task.projectId, chefId);

  if (jours <= 0) throw new BadRequestException('Le nombre de jours doit être positif');

  // Ajouter les jours à la date limite actuelle
  const newDate = new Date(task.dateLimite);
  newDate.setDate(newDate.getDate() + jours);
  
  task.dateLimite = newDate.toISOString().split('T')[0];
  task.joursSurplus += jours;
  
  await this.taskRepo.save(task);

  // 🔴 AJOUT DU TRACKING ICI
    await this.activityLogsService.logAction(task.projectId, chefId, ActionType.SURPLUS_ACCORDE, {
      taskTitre: task.titre,
      joursAccordes: jours,
      nouvelleLimite: task.dateLimite,
    });

  // Notifier le responsable
  if (task.assigneAId) {
    await this.notifService.create(
      task.assigneAId,
      `⏳ Délai prolongé ! +${jours} jour(s) accordé(s) pour la tâche "${task.titre}". Nouvelle limite : ${task.dateLimite}`
    );
  }

  return this.findOne(taskId, chefId);
}

// ─── VÉRIFICATION AUTOMATIQUE DES RETARDS (CRON) ──────
// S'exécute tous les jours à minuit
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async checkOverdueTasks() {
  const today = new Date().toISOString().split('T')[0];
  
  const overdueTasks = await this.taskRepo
    .createQueryBuilder('task')
    .where('task.dateLimite < :today', { today })
    .andWhere('task.statut != :termine', { termine: TaskStatut.TERMINE })
    .getMany();

  for (const task of overdueTasks) {
    // 1. Notifier le responsable
    if (task.assigneAId) {
      await this.notifService.create(
        task.assigneAId,
        `🚨 RETARD : Votre tâche "${task.titre}" a dépassé son délai (${task.dateLimite}). Veuillez la terminer ou demander un délai au chef de projet.`
      );
    }

    // 2. Notifier le chef de projet
    const chef = await this.memberRepo.findOne({
      where: { projectId: task.projectId, role: MemberRole.CHEF },
    });
    if (chef) {
      await this.notifService.create(
        chef.userId,
        `🚨 RETARD DÉTECTÉ : La tâche "${task.titre}" n'est pas terminée à temps.`
      );
    }
  }
}

// ─── POUR TESTER MANUELLEMENT SANS ATTENDRE MINUIT ────
async triggerOverdueCheck(userId: string) {
  await this.checkOverdueTasks();
  return { message: 'Vérification des retards exécutée manuellement' };
}

  // ─── HELPERS ──────────────────────────────────────────
  private async getMembership(projectId: string, userId: string) {
    const member = await this.memberRepo.findOne({
      where: { projectId, userId },
    });
    if (!member) {
      throw new ForbiddenException("Vous n'êtes pas membre de ce projet");
    }
    return member;
  }

  private async assertIsChef(projectId: string, userId: string) {
    const member = await this.getMembership(projectId, userId);
    if (member.role !== MemberRole.CHEF) {
      throw new ForbiddenException(
        'Seul le chef de projet peut effectuer cette action',
      );
    }
  }

  private async assertIsMemberOfProject(projectId: string, targetUserId: string) {
    const member = await this.memberRepo.findOne({
      where: { projectId, userId: targetUserId },
    });
    if (!member) {
      throw new BadRequestException(
        "Cet utilisateur n'est pas membre du projet",
      );
    }
  }

  // ─── CRÉER UNE TÂCHE (Chef uniquement) ────────────────
  async create(
    projectId: string,
    dto: CreateTaskDto,
    userId: string,
  ): Promise<Task> {
    await this.assertIsChef(projectId, userId);

    if (dto.assigneAId) {
      await this.assertIsMemberOfProject(projectId, dto.assigneAId);
    }

    const task = this.taskRepo.create({
      titre: dto.titre,
      description: dto.description,
      dateLimite: dto.dateLimite,
      dateLimiteInitiale: dto.dateLimite,
      priorite: dto.priorite,
      projectId,
      assigneAId: dto.assigneAId || null,
      createdById: userId,
    });

    const saved = await this.taskRepo.save(task);
    return this.findOne(saved.id, userId);
  }

  // ─── LISTER LES TÂCHES D'UN PROJET ────────────────────
  async findByProject(projectId: string, userId: string): Promise<Task[]> {
    await this.getMembership(projectId, userId);

    return this.taskRepo.find({
      where: { projectId },
      relations: {
        assigneA: true,
        createur: true,
      },
      order: { creeLe: 'DESC' },
    });
  }

  // ─── DÉTAIL D'UNE TÂCHE ───────────────────────────────
  async findOne(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: {
        assigneA: true,
        createur: true,
      },
    });

    if (!task) throw new NotFoundException('Tâche introuvable');

    // Vérifier que l'user est membre du projet
    await this.getMembership(task.projectId, userId);

    return task;
  }

  // ─── MODIFIER UNE TÂCHE (Chef uniquement) ─────────────
  async update(
    taskId: string,
    dto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(taskId, userId);
    await this.assertIsChef(task.projectId, userId);

    if (dto.assigneAId) {
      await this.assertIsMemberOfProject(task.projectId, dto.assigneAId);
    }

    // Si on change la date limite manuellement, on ne touche pas à dateLimiteInitiale
    Object.assign(task, dto);
    await this.taskRepo.save(task);


    return this.findOne(taskId, userId);
  }

  // ─── CHANGER LE STATUT (Responsable ou Chef) ──────────
  async updateStatut(
    taskId: string,
    statut: TaskStatut,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(taskId, userId);
    const membership = await this.getMembership(task.projectId, userId);

    const isChef = membership.role === MemberRole.CHEF;
    const isAssignee = task.assigneAId === userId;

    if (!isChef && !isAssignee) {
      throw new ForbiddenException(
        "Seul le responsable de la tâche ou le chef peut changer le statut",
      );
    }

    task.statut = statut;
    await this.taskRepo.save(task);

    // 🔴 AJOUT DU TRACKING ICI
    await this.activityLogsService.logAction(task.projectId, userId, ActionType.STATUT_MODIFIE, {
      taskTitre: task.titre,
      nouveauStatut: statut,
    });

    return this.findOne(taskId, userId);
  }

  // ─── SUPPRIMER UNE TÂCHE (Chef uniquement) ────────────
  async remove(
    taskId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const task = await this.findOne(taskId, userId);
    await this.assertIsChef(task.projectId, userId);

    await this.taskRepo.remove(task);
    return { message: 'Tâche supprimée avec succès' };
  }

  // ─── MES TÂCHES (toutes, tous projets) ────────────────
  async findMyTasks(userId: string): Promise<Task[]> {
    return this.taskRepo.find({
      where: { assigneAId: userId },
      relations: {
        assigneA: true,
        createur: true,
      },
      order: { dateLimite: 'ASC' },
    });
  }
}