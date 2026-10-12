import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface ReqUser {
  user: { sub: string; email: string };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @Get()
  findMyNotifs(@Request() req: ReqUser) {
    return this.notifService.findByUser(req.user.sub);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: ReqUser) {
    return this.notifService.markAllAsRead(req.user.sub);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: ReqUser) {
    return this.notifService.markAsRead(id, req.user.sub);
  }
}