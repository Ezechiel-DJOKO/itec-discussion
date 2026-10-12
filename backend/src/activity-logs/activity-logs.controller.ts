import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('projects/:projectId/logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(private readonly logsService: ActivityLogsService) {}

  @Get()
  getLogs(@Param('projectId') projectId: string) {
    return this.logsService.getProjectLogs(projectId);
  }
}