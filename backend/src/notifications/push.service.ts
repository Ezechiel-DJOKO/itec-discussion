import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import webpushImport from 'web-push';
import { PushSubscriptionEntity } from './entities/push-subscription.entity.js';

// Résolution de l'import web-push pour la compatibilité Node.js ESM
const webpush: any = (webpushImport as any).default || webpushImport;

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly pushSubRepo: Repository<PushSubscriptionEntity>,
  ) {}

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@itec.com';

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.logger.log('✅ Web Push VAPID initialisé avec succès');
      } catch (err: any) {
        this.logger.error(`❌ Échec de l'initialisation VAPID: ${err.message}`);
      }
    } else {
      this.logger.warn(
        '⚠️ VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY manquant. Les notifications Web Push arrières-plans sont désactivées.',
      );
    }
  }

  /**
   * Sauvegarde ou met à jour l'abonnement Push d'un utilisateur
   */
  async saveSubscription(userId: string, subscription: any) {
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return;
    }

    const existing = await this.pushSubRepo.findOne({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      existing.userId = userId;
      existing.keys = subscription.keys;
      await this.pushSubRepo.save(existing);
    } else {
      const newSub = this.pushSubRepo.create({
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      });
      await this.pushSubRepo.save(newSub);
    }
  }

  /**
   * Supprime un abonnement Push (ex: déconnexion)
   */
  async removeSubscription(endpoint: string) {
    await this.pushSubRepo.delete({ endpoint });
  }

  /**
   * Envoie une notification Push VAPID aux utilisateurs ciblés
   */
  async sendPushToUsers(userIds: string[], payload: PushPayload) {
    if (!userIds || userIds.length === 0) return;

    const subs = await this.pushSubRepo.find({
      where: { userId: In(userIds) },
    });

    if (subs.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/dashboard/chat',
    });

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload);
      } catch (error: any) {
        // 410 Gone ou 404 Not Found signifie que le navigateur a révoqué l'abonnement -> nettoyage
        if (error.statusCode === 410 || error.statusCode === 404) {
          this.logger.log(`Abonnement expiré ou révoqué supprimé: ${sub.endpoint}`);
          await this.pushSubRepo.delete({ id: sub.id });
        } else {
          this.logger.error(`Erreur lors de l'envoi Push VAPID: ${error.message}`);
        }
      }
    }
  }
}