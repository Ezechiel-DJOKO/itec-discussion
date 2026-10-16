import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { MessagesModule } from '../messages/messages.module.js'; // 👈 Ajuste le chemin vers ton messages.module si nécessaire

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => MessagesModule), // 👈 Permet d'injecter MessagesGateway sans boucle circulaire
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}