import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMessage } from './entities/project-message.entity.js';
import { TaskComment } from './entities/task-comment.entity.js';
import { ProjectMember } from '../projects/entities/project-member.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { MessagesService } from './messages.service.js';
import { MessagesController } from './messages.controller.js';
import { MessagesGateway } from './messages.gateway.js';
import { ChannelMessage } from './entities/channel-message.entity.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectMessage, TaskComment, ChannelMessage, ProjectMember, Task, User])],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
})
export class MessagesModule {}