import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
  ) {}

  async create(userId: string, message: string) {
    const notif = this.notifRepo.create({ userId, message });
    return this.notifRepo.save(notif);
  }

  async findByUser(userId: string) {
    return this.notifRepo.find({
      where: { userId },
      order: { creeLe: 'DESC' },
      take: 50, // 50 dernières
    });
  }

  async markAsRead(id: string, userId: string) {
    await this.notifRepo.update({ id, userId }, { lu: true });
  }

  async markAllAsRead(userId: string) {
    await this.notifRepo.update({ userId, lu: false }, { lu: true });
  }
}