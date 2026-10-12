import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './entities/activity-log.entity.js';
import { ActivityLogsService } from './activity-logs.service.js';
import { ActivityLogsController } from './activity-logs.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService], // On l'exporte pour l'utiliser ailleurs
})
export class ActivityLogsModule {}