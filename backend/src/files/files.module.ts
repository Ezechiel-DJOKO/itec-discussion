import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskFile } from './entities/task-file.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { ProjectMember } from '../projects/entities/project-member.entity.js';
import { FilesService } from './files.service.js';
import { FilesController } from './files.controller.js';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([TaskFile, Task, ProjectMember]), ActivityLogsModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}