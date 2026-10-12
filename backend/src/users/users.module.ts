import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { Penalty } from './entities/penalty.entity.js'; // 👈
import { Task } from '../tasks/entities/task.entity.js'; // 👈
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AdminController } from './admin.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js'; // 👈

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Penalty, Task]), // 👈 AJOUTER PENALTY ET TASK
    NotificationsModule // 👈 AJOUTER
  ],
  controllers: [UsersController, AdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}