import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity.js';
import { PushSubscriptionEntity } from './entities/push-subscription.entity.js';
import { NotificationsService } from './notifications.service.js';
import { PushService } from './push.service.js';
import { NotificationsController } from './notifications.controller.js';
import { MessagesModule } from '../messages/messages.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, PushSubscriptionEntity]),
    forwardRef(() => MessagesModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}