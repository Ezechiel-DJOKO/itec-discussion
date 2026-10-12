import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ChannelType } from './entities/channel-message.entity.js';

interface ReqUser { user: { sub: string } }

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly msgService: MessagesService) {}

  @Get('projects/:projectId/messages')
  getProjectMsgs(@Param('projectId') projectId: string, @Request() req: ReqUser) {
    return this.msgService.getProjectMessages(projectId, req.user.sub);
  }

  @Post('projects/:projectId/messages')
  addProjectMsg(@Param('projectId') projectId: string, @Body('message') message: string, @Request() req: ReqUser) {
    return this.msgService.addProjectMessage(projectId, req.user.sub, message);
  }

  @Get('tasks/:taskId/comments')
  getTaskComments(@Param('taskId') taskId: string, @Request() req: ReqUser) {
    return this.msgService.getTaskComments(taskId, req.user.sub);
  }

  @Post('tasks/:taskId/comments')
  addTaskComment(@Param('taskId') taskId: string, @Body('message') message: string, @Request() req: ReqUser) {
    return this.msgService.addTaskComment(taskId, req.user.sub, message);
  }

  @Get('channels/:type/messages')
  getChannelMsgs(@Param('type') type: ChannelType, @Request() req: ReqUser) {
    return this.msgService.getChannelMessages(type, req.user.sub);
  }

  @Post('channels/:type/messages')
  addChannelMsg(
    @Param('type') type: ChannelType,
    @Body('message') message: string,
    @Request() req: ReqUser,
  ) {
    return this.msgService.addChannelMessage(type, req.user.sub, message);
  }
}