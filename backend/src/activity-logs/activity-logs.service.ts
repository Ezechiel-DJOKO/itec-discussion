import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, ActionType } from './entities/activity-log.entity.js';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly logRepo: Repository<ActivityLog>,
  ) {}

  // Enregistrer une action
  async logAction(projectId: string, userId: string, action: ActionType, details: any) {
    const log = this.logRepo.create({
      projectId,
      userId,
      action,
      details,
    });
    await this.logRepo.save(log);
  }

  // Récupérer l'historique d'un projet
  async getProjectLogs(projectId: string): Promise<ActivityLog[]> {
    return this.logRepo.find({
      where: { projectId },
      order: { creeLe: 'DESC' },
      take: 100, // On limite aux 100 dernières actions pour la performance
    });
  }
}