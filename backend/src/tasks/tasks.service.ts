import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task, TaskStatut } from './entities/task.entity.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { ProjectMember, MemberRole } from '../projects/entities/project-member.entity.js';
import { UsersService } from '../users/users.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { ActionType } from '../activity-logs/entities/activity-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(ProjectMember) private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly usersService: UsersService,
    private readonly notifService: NotificationsService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private async getMembership(projectId: string, userId: string) {
    const member = await this.memberRepo.findOne({ where: { projectId, userId } });
    if (!member) throw new ForbiddenException("Vous n'êtes pas membre de ce projet");
    return member;
  }

  private async assertIsChef(projectId: string, userId: string) {
    const member = await this.getMembership(projectId, userId);
    if (member.role !== MemberRole.CHEF) {
      throw new ForbiddenException('Seul le chef de projet peut effectuer cette action');
    }
  }

  /** Notifie une liste d'users (sauf l'auteur) */
  private async notifyUsers(
    userIds: string[],
    message: string,
    exceptUserId?: string,
  ) {
    const unique = [...new Set(userIds.filter((id) => id && id !== exceptUserId))];
    for (const uid of unique) {
      try {
        await this.notifService.create(uid, message);
      } catch (e) {
        // on n'bloque pas la tâche si une notif échoue
        console.error('Notif error', uid, e);
      }
    }
  }

  async create(projectId: string, dto: CreateTaskDto, userId: string): Promise<Task> {
    await this.assertIsChef(projectId, userId);

    let assignes: User[] = [];
    if (dto.assignesIds && dto.assignesIds.length > 0) {
      assignes = await this.userRepo.findBy({ id: In(dto.assignesIds) });
    }

    const creator = await this.userRepo.findOne({ where: { id: userId } });
    const creatorName = creator?.nom || 'Un chef de projet';

    const task = this.taskRepo.create({
      titre: dto.titre,
      description: dto.description,
      readme: dto.readme,
      dateLimite: dto.dateLimite,
      dateLimiteInitiale: dto.dateLimite,
      priorite: dto.priorite,
      projectId,
      assignes,
      createdById: userId,
    });

    const saved = await this.taskRepo.save(task);

    // 🔔 Notif : tâche assignée
    if (assignes.length > 0) {
      await this.notifyUsers(
        assignes.map((a) => a.id),
        `📋 ${creatorName} vous a assigné la tâche « ${saved.titre} »`,
        userId,
      );
    }

    return this.findOne(saved.id, userId);
  }

  async findByProject(projectId: string, userId: string): Promise<Task[]> {
    await this.getMembership(projectId, userId);
    return this.taskRepo.find({
      where: { projectId },
      relations: { assignes: true, project: true, createur: true },
      order: { creeLe: 'DESC' },
    });
  }

  async findOne(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { assignes: true, project: true, createur: true },
    });

    if (!task) throw new NotFoundException('Tâche introuvable');
    await this.getMembership(task.projectId, userId);
    return task;
  }

  async update(taskId: string, dto: UpdateTaskDto, userId: string): Promise<Task> {
    const task = await this.findOne(taskId, userId);
    await this.assertIsChef(task.projectId, userId);

    const actor = await this.userRepo.findOne({ where: { id: userId } });
    const actorName = actor?.nom || 'Un chef de projet';

    const oldAssigneeIds = (task.assignes || []).map((a) => a.id);

    if (dto.assignesIds) {
      task.assignes = await this.userRepo.findBy({ id: In(dto.assignesIds) });
    }

    if (dto.titre) task.titre = dto.titre;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.readme !== undefined) task.readme = dto.readme;
    if (dto.dateLimite) task.dateLimite = dto.dateLimite;
    if (dto.priorite) task.priorite = dto.priorite;
    if (dto.statut) task.statut = dto.statut;

    await this.taskRepo.save(task);

    const refreshed = await this.findOne(taskId, userId);
    const newAssigneeIds = (refreshed.assignes || []).map((a) => a.id);

    // Nouveaux assignés uniquement
    if (dto.assignesIds) {
      const newlyAssigned = newAssigneeIds.filter((id) => !oldAssigneeIds.includes(id));
      await this.notifyUsers(
        newlyAssigned,
        `📋 ${actorName} vous a assigné la tâche « ${refreshed.titre} »`,
        userId,
      );
    }

    // Changement de statut via update général
    if (dto.statut) {
      await this.notifyUsers(
        newAssigneeIds,
        `🔄 ${actorName} a passé la tâche « ${refreshed.titre} » → ${dto.statut}`,
        userId,
      );
    }

    return refreshed;
  }

  async updateStatut(taskId: string, statut: TaskStatut, userId: string): Promise<Task> {
    const task = await this.findOne(taskId, userId);
    const membership = await this.getMembership(task.projectId, userId);

    const isChef = membership.role === MemberRole.CHEF;
    const isAssignee = task.assignes?.some((a) => a.id === userId);

    if (!isChef && !isAssignee) {
      throw new ForbiddenException(
        'Seul un responsable de la tâche ou le chef peut changer le statut',
      );
    }

    const actor = await this.userRepo.findOne({ where: { id: userId } });
    const actorName = actor?.nom || 'Quelqu\'un';
    const oldStatut = task.statut;

    task.statut = statut;
    await this.taskRepo.save(task);

    await this.activityLogsService.logAction(task.projectId, userId, ActionType.STATUT_MODIFIE, {
      taskTitre: task.titre,
      nouveauStatut: statut,
    });

    // 🔔 Notifier les autres assignés + le chef
    const assigneeIds = (task.assignes || []).map((a) => a.id);
    const chef = await this.memberRepo.findOne({
      where: { projectId: task.projectId, role: MemberRole.CHEF },
    });
    const recipients = [...assigneeIds];
    if (chef?.userId) recipients.push(chef.userId);

    await this.notifyUsers(
      recipients,
      `🔄 ${actorName} a changé le statut de « ${task.titre} » : ${oldStatut} → ${statut}`,
      userId,
    );

    return this.findOne(taskId, userId);
  }

  async addSurplus(taskId: string, jours: number, chefId: string): Promise<Task> {
    const task = await this.findOne(taskId, chefId);
    await this.assertIsChef(task.projectId, chefId);

    if (jours <= 0) throw new BadRequestException('Le nombre de jours doit être positif');

    const newDate = new Date(task.dateLimite);
    newDate.setDate(newDate.getDate() + jours);

    task.dateLimite = newDate.toISOString().split('T')[0];
    task.joursSurplus += jours;

    await this.taskRepo.save(task);

    await this.activityLogsService.logAction(task.projectId, chefId, ActionType.SURPLUS_ACCORDE, {
      taskTitre: task.titre,
      joursAccordes: jours,
      nouvelleLimite: task.dateLimite,
    });

    if (task.assignes && task.assignes.length > 0) {
      for (const assignee of task.assignes) {
        await this.notifService.create(
          assignee.id,
          `⏳ Délai prolongé ! +${jours} jour(s) pour « ${task.titre} ». Nouvelle limite : ${task.dateLimite}`,
        );
      }
    }

    return this.findOne(taskId, chefId);
  }

  async remove(taskId: string, userId: string): Promise<{ message: string }> {
    const task = await this.findOne(taskId, userId);
    await this.assertIsChef(task.projectId, userId);

    const titre = task.titre;
    const assigneeIds = (task.assignes || []).map((a) => a.id);

    await this.taskRepo.remove(task);

    await this.notifyUsers(
      assigneeIds,
      `🗑️ La tâche « ${titre} » a été supprimée`,
      userId,
    );

    return { message: 'Tâche supprimée avec succès' };
  }

  async findMyTasks(userId: string): Promise<Task[]> {
    return this.taskRepo.find({
      where: { assignes: { id: userId } },
      relations: { assignes: true, createur: true },
      order: { dateLimite: 'ASC' },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkOverdueTasks() {
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignes', 'assignes')
      .where('task.dateLimite < :today', { today })
      .andWhere('task.statut != :termine', { termine: TaskStatut.TERMINE })
      .getMany();

    for (const task of overdueTasks) {
      if (task.assignes && task.assignes.length > 0) {
        for (const assignee of task.assignes) {
          await this.notifService.create(
            assignee.id,
            `🚨 RETARD : Votre tâche « ${task.titre} » a dépassé son délai (${task.dateLimite}).`,
          );
        }
      }

      const chef = await this.memberRepo.findOne({
        where: { projectId: task.projectId, role: MemberRole.CHEF },
      });
      if (chef) {
        await this.notifService.create(
          chef.userId,
          `🚨 RETARD DÉTECTÉ : La tâche « ${task.titre} » n'est pas terminée à temps.`,
        );
      }
    }
  }

  async triggerOverdueCheck(userId: string) {
    await this.checkOverdueTasks();
    return { message: 'Vérification des retards exécutée manuellement' };
  }
}