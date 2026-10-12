import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMessage } from './entities/project-message.entity.js';
import { TaskComment } from './entities/task-comment.entity.js';
import { MemberRole, ProjectMember } from '../projects/entities/project-member.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { MessagesGateway } from './messages.gateway.js';
// 🔴 NOUVEAUX IMPORTS EN HAUT :
import { ChannelMessage, ChannelType } from './entities/channel-message.entity.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(ProjectMessage) private readonly msgRepo: Repository<ProjectMessage>,
    @InjectRepository(TaskComment) private readonly commentRepo: Repository<TaskComment>,
    @InjectRepository(ProjectMember) private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    private readonly gateway: MessagesGateway,
    // 🔴 AJOUTER DANS LE CONSTRUCTOR :
    @InjectRepository(ChannelMessage) private readonly channelMsgRepo: Repository<ChannelMessage>,
    @InjectRepository(User) private readonly userRepo: Repository<User>
  ) {}

  // ─── CHAT DU PROJET ────────────────────────────────────────
  async getProjectMessages(projectId: string, userId: string) {
    const member = await this.memberRepo.findOne({ where: { projectId, userId } });
    if (!member) throw new ForbiddenException("Non autorisé");

    return this.msgRepo.find({
      where: { projectId },
      order: { creeLe: 'ASC' },
    });
  }

  async addProjectMessage(projectId: string, userId: string, texte: string) {
    const member = await this.memberRepo.findOne({ where: { projectId, userId } });
    if (!member) throw new ForbiddenException("Non autorisé");

    const msg = await this.msgRepo.save(this.msgRepo.create({ projectId, userId, message: texte }));
    const savedMsg = await this.msgRepo.findOne({ where: { id: msg.id } }); // Pour avoir la relation User
    
    // 🔥 Diffuser en temps réel
    this.gateway.diffuserProjectMessage(projectId, savedMsg);
    return savedMsg;
  }

  // ─── COMMENTAIRES DE TÂCHE ─────────────────────────────────
  async getTaskComments(taskId: string, userId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const member = await this.memberRepo.findOne({ where: { projectId: task.projectId, userId } });
    if (!member) throw new ForbiddenException("Non autorisé");

    return this.commentRepo.find({
      where: { taskId },
      order: { creeLe: 'ASC' },
    });
  }

    async addTaskComment(taskId: string, userId: string, texte: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    
    // 🔥 C'EST CETTE LIGNE QUI MANQUAIT POUR ENLEVER L'ERREUR ROUGE :
    if (!task) throw new NotFoundException('Tâche introuvable');

    const member = await this.memberRepo.findOne({ where: { projectId: task.projectId, userId } });
    if (!member) throw new ForbiddenException("Non autorisé");

    const comment = await this.commentRepo.save(this.commentRepo.create({ taskId, userId, message: texte }));
    const savedComment = await this.commentRepo.findOne({ where: { id: comment.id } });

    // 🔥 Diffuser en temps réel
    this.gateway.diffuserTaskComment(taskId, savedComment);
    return savedComment;
  }

// 🔴 AJOUTER CES MÉTHODES TOUT EN BAS DU FICHIER :

  // ─── VÉRIFIER SI L'UTILISATEUR EST RESPONSABLE ────────────
  private async isResponsable(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.isSuperAdmin) return true;

    const isChef = await this.memberRepo.count({
      where: { userId, role: MemberRole.CHEF },
    });
    return isChef > 0;
  }

  // ─── CHANNELS GLOBAUX ET RESPONSABLES ─────────────────────
  async getChannelMessages(channel: ChannelType, userId: string) {
    if (channel === ChannelType.RESPONSABLES) {
      const isResp = await this.isResponsable(userId);
      if (!isResp) throw new ForbiddenException('Accès réservé aux responsables');
    }

    return this.channelMsgRepo.find({
      where: { channel },
      order: { creeLe: 'ASC' }, // ASC pour afficher les plus anciens en haut (logique de chat)
    });
  }

  async addChannelMessage(channel: ChannelType, userId: string, texte: string) {
    if (channel === ChannelType.RESPONSABLES) {
      const isResp = await this.isResponsable(userId);
      if (!isResp) throw new ForbiddenException('Accès réservé aux responsables');
    }

    const msg = await this.channelMsgRepo.save(
      this.channelMsgRepo.create({ channel, userId, message: texte }),
    );
    const savedMsg = await this.channelMsgRepo.findOne({ where: { id: msg.id } });

    // Diffuser
    this.gateway.diffuserChannelMessage(channel, savedMsg);
    return savedMsg;
  }
}