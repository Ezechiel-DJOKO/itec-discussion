import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity.js';
import { ProjectMember } from '../projects/entities/project-member.entity.js';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';
import { UsersModule } from '../users/users.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, ProjectMember, User]),
    TypeOrmModule.forFeature([Task, ProjectMember]),
    UsersModule,
    NotificationsModule,
    ActivityLogsModule
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}