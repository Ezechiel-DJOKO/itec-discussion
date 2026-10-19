import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMessage } from './entities/project-message.entity.js';
import { TaskComment } from './entities/task-comment.entity.js';
import { MemberRole, ProjectMember } from '../projects/entities/project-member.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { MessagesGateway } from './messages.gateway.js';
import { ChannelMessage, ChannelType } from './entities/channel-message.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AppPermission } from '../users/entities/user.entity.js';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(ProjectMessage) private readonly msgRepo: Repository<ProjectMessage>,
    @InjectRepository(TaskComment) private readonly commentRepo: Repository<TaskComment>,
    @InjectRepository(ProjectMember) private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    private readonly gateway: MessagesGateway,
    @InjectRepository(ChannelMessage) private readonly channelMsgRepo: Repository<ChannelMessage>,
    @InjectRepository(User) private readonly userRepo: Repository<User>
  ) {}

  private generateReplyPreview(originalMessage: any) {
    if (!originalMessage || originalMessage.isDeleted) return null;
    let preview = originalMessage.message;
    if (preview.startsWith('[')) {
      if (preview.startsWith('[IMAGE]')) preview = '📷 Image';
      else if (preview.startsWith('[AUDIO]')) preview = '🎤 Vocal';
      else if (preview.startsWith('[FILE]')) preview = '📎 Fichier';
      else if (preview.startsWith('[TRANSFERT]')) preview = '🔄 Message transféré';
    }
    return {
      id: originalMessage.id,
      nom: originalMessage.user?.nom || 'Inconnu',
      preview: preview.substring(0, 60) + (preview.length > 60 ? '...' : ''),
    };
  }

  async getProjectMessages(projectId: string, userId: string) {
    const member = await this.memberRepo.findOne({ where: { projectId, userId } });
    if (!member) throw new ForbiddenException("Non autorisé");

    return this.msgRepo.find({
      where: { projectId },
      order: { creeLe: 'ASC' },
      relations: { user: true } // 👈 CORRECTION TYPEORM v0.3
    });
  }

  async addProjectMessage(projectId: string, userId: string, texte: string, replyToId?: string) {
    const member = await this.memberRepo.findOne({ where: { projectId, userId } });
    if (!member) throw new ForbiddenException("Non autorisé");

    let replyTo = null;
    if (replyToId) {
      const original = await this.msgRepo.findOne({ where: { id: replyToId }, relations: { user: true } });
      replyTo = this.generateReplyPreview(original);
    }

    const msg = await this.msgRepo.save(this.msgRepo.create({ projectId, userId, message: texte, replyToId, replyTo }));
    
    const savedMsg = await this.msgRepo.findOne({ 
      where: { id: msg.id },
      relations: { user: true } // 👈 CORRECTION TYPEORM v0.3
    });
    
    this.gateway.diffuserProjectMessage(projectId, savedMsg);
    return savedMsg;
  }

  async getTaskComments(taskId: string, userId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const member = await this.memberRepo.findOne({ where: { projectId: task.projectId, userId } });
    if (!member) throw new ForbiddenException("Non autorisé");

    return this.commentRepo.find({
      where: { taskId },
      order: { creeLe: 'ASC' },
      relations: { user: true } // 👈 CORRECTION TYPEORM v0.3
    });
  }

  async addTaskComment(taskId: string, userId: string, texte: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const member = await this.memberRepo.findOne({ where: { projectId: task.projectId, userId } });
    if (!member) throw new ForbiddenException("Non autorisé");

    const comment = await this.commentRepo.save(this.commentRepo.create({ taskId, userId, message: texte }));
    
    const savedComment = await this.commentRepo.findOne({ 
      where: { id: comment.id },
      relations: { user: true } // 👈 CORRECTION TYPEORM v0.3
    });

    this.gateway.diffuserTaskComment(taskId, savedComment);
    return savedComment;
  }

  private async isResponsable(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const perms = user.permissions || [];
    if (perms.includes(AppPermission.CAN_ACCESS_QG)) return true;
    return false;
  }

  async getChannelMessages(channel: ChannelType, userId: string) {
    if (channel === ChannelType.RESPONSABLES) {
      const isResp = await this.isResponsable(userId);
      if (!isResp) throw new ForbiddenException('Accès réservé aux responsables');
    }
    return this.channelMsgRepo.find({
      where: { channel },
      order: { creeLe: 'ASC' },
      relations: { user: true } // 👈 CORRECTION TYPEORM v0.3
    });
  }

  async addChannelMessage(channel: ChannelType, userId: string, texte: string, replyToId?: string) {
    if (channel === ChannelType.RESPONSABLES) {
      const isResp = await this.isResponsable(userId);
      if (!isResp) throw new ForbiddenException('Accès réservé aux responsables');
    }

    let replyTo = null;
    if (replyToId) {
      const original = await this.channelMsgRepo.findOne({ where: { id: replyToId }, relations: { user: true } });
      replyTo = this.generateReplyPreview(original);
    }

    const msg = await this.channelMsgRepo.save(this.channelMsgRepo.create({ channel, userId, message: texte, replyToId, replyTo }));
    
    const savedMsg = await this.channelMsgRepo.findOne({ 
      where: { id: msg.id },
      relations: { user: true } // 👈 CORRECTION TYPEORM v0.3
    });

    this.gateway.diffuserChannelMessage(channel, savedMsg);
    return savedMsg;
  }

  async updateProjectMessage(id: string, userId: string, newText: string) {
    const msg = await this.msgRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.userId !== userId) throw new ForbiddenException('Non autorisé');

    msg.message = newText;
    msg.isEdited = true;
    const saved = await this.msgRepo.save(msg);
    const full = await this.msgRepo.findOne({ where: { id: saved.id }, relations: { user: true } });
    this.gateway.diffuserProjectMessageUpdate(msg.projectId, full);
    return full;
  }

  async deleteProjectMessage(id: string, userId: string) {
    const msg = await this.msgRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.userId !== userId) throw new ForbiddenException('Non autorisé');

    msg.message = ' Ce message a été supprimé';
    msg.isDeleted = true;
    const saved = await this.msgRepo.save(msg);
    const full = await this.msgRepo.findOne({ where: { id: saved.id }, relations: { user: true } });
    this.gateway.diffuserProjectMessageUpdate(msg.projectId, full);
    return full;
  }

  async updateChannelMessage(id: string, userId: string, newText: string) {
    const msg = await this.channelMsgRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.userId !== userId) throw new ForbiddenException('Non autorisé');

    msg.message = newText;
    msg.isEdited = true;
    const saved = await this.channelMsgRepo.save(msg);
    const full = await this.channelMsgRepo.findOne({ where: { id: saved.id }, relations: { user: true } });
    this.gateway.diffuserChannelMessageUpdate(msg.channel, full);
    return full;
  }

  async deleteChannelMessage(id: string, userId: string) {
    const msg = await this.channelMsgRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message introuvable');
    if (msg.userId !== userId) throw new ForbiddenException('Non autorisé');

    msg.message = ' Ce message a été supprimé';
    msg.isDeleted = true;
    const saved = await this.channelMsgRepo.save(msg);
    const full = await this.channelMsgRepo.findOne({ where: { id: saved.id }, relations: { user: true } });
    this.gateway.diffuserChannelMessageUpdate(msg.channel, full);
    return full;
  }

  async togglePinProjectMessage(id: string, userId: string) {
    const msg = await this.msgRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message introuvable');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    const member = await this.memberRepo.findOne({ where: { projectId: msg.projectId, userId } });

    if (!user?.isSuperAdmin && member?.role !== MemberRole.CHEF) {
      throw new ForbiddenException('Seuls les responsables peuvent épingler un message');
    }

    msg.isPinned = !msg.isPinned;
    const saved = await this.msgRepo.save(msg);
    const full = await this.msgRepo.findOne({ where: { id: saved.id }, relations: { user: true } });
    this.gateway.diffuserProjectMessageUpdate(msg.projectId, full);
    return full;
  }

  async togglePinChannelMessage(id: string, userId: string) {
    const msg = await this.channelMsgRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message introuvable');

    const isResp = await this.isResponsable(userId);
    if (!isResp) throw new ForbiddenException('Seuls les responsables peuvent épingler un message');

    msg.isPinned = !msg.isPinned;
    const saved = await this.channelMsgRepo.save(msg);
    const full = await this.channelMsgRepo.findOne({ where: { id: saved.id }, relations: { user: true } });
    this.gateway.diffuserChannelMessageUpdate(msg.channel, full);
    return full;
  }

  async reactToProjectMessage(id: string, userId: string, emoji: string) {
    const msg = await this.msgRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message introuvable');

    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

    const userIndex = msg.reactions[emoji].indexOf(userId);
    if (userIndex > -1) {
      msg.reactions[emoji].splice(userIndex, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].push(userId);
    }

    const saved = await this.msgRepo.save(msg);
    const full = await this.msgRepo.findOne({ where: { id: saved.id }, relations: { user: true } });
    this.gateway.diffuserProjectMessageUpdate(msg.projectId, full);
    return full;
  }

  async reactToChannelMessage(id: string, userId: string, emoji: string) {
    const msg = await this.channelMsgRepo.findOne({ where: { id } });
    if (!msg) throw new NotFoundException('Message introuvable');

    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

    const userIndex = msg.reactions[emoji].indexOf(userId);
    if (userIndex > -1) {
      msg.reactions[emoji].splice(userIndex, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    } else {
      msg.reactions[emoji].push(userId);
    }

    const saved = await this.channelMsgRepo.save(msg);
    const full = await this.channelMsgRepo.findOne({ where: { id: saved.id }, relations: { user: true } });
    this.gateway.diffuserChannelMessageUpdate(msg.channel, full);
    return full;
  }
}