import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  Delete,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PushService } from './push.service.js';

interface ReqUser {
  user: { sub: string; email: string };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService, private readonly pushService: PushService) {}

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

  @Post('push-subscription')
  async subscribe(@Req() req: any, @Body() subscription: any) {
    const userId = req.user.id || req.user.sub;
    await this.pushService.saveSubscription(userId, subscription);
    return { success: true, message: 'Abonnement Push enregistré avec succès.' };
  }

  @Delete('push-subscription')
  async unsubscribe(@Body('endpoint') endpoint: string) {
    if (endpoint) {
      await this.pushService.removeSubscription(endpoint);
    }
    return { success: true };
  }
}