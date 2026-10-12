import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskFile } from './entities/task-file.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { ProjectMember, MemberRole } from '../projects/entities/project-member.entity.js';
import * as fs from 'fs';
import * as path from 'path';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { ActionType } from '../activity-logs/entities/activity-log.entity.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(TaskFile)
    private readonly fileRepo: Repository<TaskFile>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  private async getTaskAndCheckAccess(taskId: string, userId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const member = await this.memberRepo.findOne({
      where: { projectId: task.projectId, userId },
    });
    if (!member) {
      throw new ForbiddenException("Vous n'êtes pas membre de ce projet");
    }

    return { task, member };
  }

  // ─── UPLOAD ────────────────────────────────────────────
  async upload(
    taskId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<TaskFile> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const { task, member } = await this.getTaskAndCheckAccess(taskId, userId);

    const isChef = member.role === MemberRole.CHEF;
    const isAssignee = task.assigneAId === userId;

    if (!isChef && !isAssignee) {
      // Supprimer le fichier déjà écrit sur disque
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new ForbiddenException(
        'Seul le responsable de la tâche ou le chef peut uploader un fichier',
      );
    }

    const taskFile = this.fileRepo.create({
      nomOriginal: file.originalname,
      nomStockage: file.filename,
      mimetype: file.mimetype,
      taille: file.size,
      chemin: file.filename,
      taskId,
      uploadedById: userId,
    });

    // 🔴 AJOUT DU TRACKING ICI
    await this.activityLogsService.logAction(task.projectId, userId, ActionType.FICHIER_UPLOADE, {
      taskTitre: task.titre,
      nomFichier: file.originalname,
    });


    return this.fileRepo.save(taskFile);
  }

  // ─── LISTER LES FICHIERS D'UNE TÂCHE ───────────────────
  async findByTask(taskId: string, userId: string): Promise<TaskFile[]> {
    await this.getTaskAndCheckAccess(taskId, userId);

    return this.fileRepo.find({
      where: { taskId },
      relations: { uploadedBy: true },
      order: { uploadedAt: 'DESC' },
    });
  }

  // ─── TÉLÉCHARGER ───────────────────────────────────────
  async getFileForDownload(
    fileId: string,
    userId: string,
  ): Promise<{ file: TaskFile; absolutePath: string }> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId },
      relations: { uploadedBy: true },
    });
    if (!file) throw new NotFoundException('Fichier introuvable');

    await this.getTaskAndCheckAccess(file.taskId, userId);

    const absolutePath = path.join(UPLOADS_DIR, file.nomStockage);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Fichier manquant sur le serveur');
    }

    return { file, absolutePath };
  }

  // ─── SUPPRIMER ─────────────────────────────────────────
  async remove(fileId: string, userId: string): Promise<{ message: string }> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException('Fichier introuvable');

    const { member } = await this.getTaskAndCheckAccess(file.taskId, userId);

    const isChef = member.role === MemberRole.CHEF;
    const isOwner = file.uploadedById === userId;

    if (!isChef && !isOwner) {
      throw new ForbiddenException(
        "Vous ne pouvez supprimer que vos propres fichiers (ou être chef)",
      );
    }

    // Supprimer du disque
    const absolutePath = path.join(UPLOADS_DIR, file.nomStockage);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await this.fileRepo.remove(file);
    return { message: 'Fichier supprimé' };
  }
}