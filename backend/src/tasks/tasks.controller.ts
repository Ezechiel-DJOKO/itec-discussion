import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { UpdateStatutDto } from './dto/update-statut.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface ReqUser {
  user: { sub: string; email: string };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('projects/:projectId/tasks')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.create(projectId, dto, req.user.sub);
  }

  @Get('projects/:projectId/tasks')
  findByProject(
    @Param('projectId') projectId: string,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.findByProject(projectId, req.user.sub);
  }

  @Get('tasks/mine')
  findMyTasks(@Request() req: ReqUser) {
    return this.tasksService.findMyTasks(req.user.sub);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string, @Request() req: ReqUser) {
    return this.tasksService.findOne(id, req.user.sub);
  }

  // PUT /tasks/:id
  @Put('tasks/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.update(id, dto, req.user.sub);
  }

  // PATCH /tasks/:id
  @Patch('tasks/:id')
  patchUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.update(id, dto, req.user.sub);
  }

  // PATCH /tasks/:id/readme
  @Patch('tasks/:id/readme')
  patchReadme(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: ReqUser,
  ) {
    const readme = typeof body === 'string' ? body : body?.readme;
    return this.tasksService.update(id, { readme }, req.user.sub);
  }

  // PUT /tasks/:id/readme
  @Put('tasks/:id/readme')
  putReadme(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: ReqUser,
  ) {
    const readme = typeof body === 'string' ? body : body?.readme;
    return this.tasksService.update(id, { readme }, req.user.sub);
  }

  @Patch('tasks/:id/statut')
  updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateStatutDto,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.updateStatut(id, dto.statut, req.user.sub);
  }

  @Delete('tasks/:id')
  remove(@Param('id') id: string, @Request() req: ReqUser) {
    return this.tasksService.remove(id, req.user.sub);
  }

  @Post('tasks/trigger-check')
  triggerCheck(@Request() req: ReqUser) {
    return this.tasksService.triggerOverdueCheck(req.user.sub);
  }

  @Patch('tasks/:id/surplus')
  addSurplus(
    @Param('id') id: string,
    @Body('jours') jours: number,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.addSurplus(id, Number(jours), req.user.sub);
  }
}