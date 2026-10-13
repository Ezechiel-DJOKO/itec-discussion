import { Controller, Get, Post, Param, Body, UseGuards, Request, Patch, Delete } from '@nestjs/common';
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
  addProjectMsg(
    @Param('projectId') projectId: string, 
    @Body() body: { message: string, replyToId?: string }, 
    @Request() req: ReqUser
  ) {
    return this.msgService.addProjectMessage(projectId, req.user.sub, body.message, body.replyToId);
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
    @Body() body: { message: string, replyToId?: string },
    @Request() req: ReqUser,
  ) {
    return this.msgService.addChannelMessage(type, req.user.sub, body.message, body.replyToId);
  }

    @Patch('projects/messages/:id')
  updateProjectMsg(@Param('id') id: string, @Body('message') message: string, @Request() req: ReqUser) {
    return this.msgService.updateProjectMessage(id, req.user.sub, message);
  }

  @Delete('projects/messages/:id')
  deleteProjectMsg(@Param('id') id: string, @Request() req: ReqUser) {
    return this.msgService.deleteProjectMessage(id, req.user.sub);
  }

  @Patch('channels/messages/:id')
  updateChannelMsg(@Param('id') id: string, @Body('message') message: string, @Request() req: ReqUser) {
    return this.msgService.updateChannelMessage(id, req.user.sub, message);
  }

  @Delete('channels/messages/:id')
  deleteChannelMsg(@Param('id') id: string, @Request() req: ReqUser) {
    return this.msgService.deleteChannelMessage(id, req.user.sub);
  }

    @Post('messages/forward')
  async forward(
    @Body() body: { message: string; targetType: 'project' | 'channel'; targetId: string },
    @Request() req: ReqUser,
  ) {
    const text = body.message;
    if (body.targetType === 'project') {
      return this.msgService.addProjectMessage(body.targetId, req.user.sub, text);
    }
    return this.msgService.addChannelMessage(body.targetId as any, req.user.sub, text);
  }
}