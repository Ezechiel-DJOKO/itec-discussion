import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { MessagesGateway } from '../messages/messages.gateway.js'; // 👈 Adapte le chemin si nécessaire

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly gateway: MessagesGateway,
  ) {}

  async create(userId: string, message: string) {
    const notif = this.notifRepo.create({ userId, message, lu: false });
    const saved = await this.notifRepo.save(notif);

    // ⚡ TRANSMISSION TEMPS RÉEL (Son + Cloche + Push Téléphone)
    try {
      this.gateway.diffuserNotification(userId, saved);
    } catch (err) {
      console.error("Erreur lors de l'émission WebSocket de la notification:", err);
    }

    return saved;
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