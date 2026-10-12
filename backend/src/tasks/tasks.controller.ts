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

  // POST /projects/:projectId/tasks — Créer une tâche
  @Post('projects/:projectId/tasks')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.create(projectId, dto, req.user.sub);
  }

  // GET /projects/:projectId/tasks — Lister les tâches d'un projet
  @Get('projects/:projectId/tasks')
  findByProject(
    @Param('projectId') projectId: string,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.findByProject(projectId, req.user.sub);
  }

  // GET /tasks/mine — Mes tâches assignées
  @Get('tasks/mine')
  findMyTasks(@Request() req: ReqUser) {
    return this.tasksService.findMyTasks(req.user.sub);
  }

  // GET /tasks/:id — Détail d'une tâche
  @Get('tasks/:id')
  findOne(@Param('id') id: string, @Request() req: ReqUser) {
    return this.tasksService.findOne(id, req.user.sub);
  }

  // PUT /tasks/:id — Modifier une tâche (chef)
  @Put('tasks/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.update(id, dto, req.user.sub);
  }

  // PATCH /tasks/:id/statut — Changer le statut
  @Patch('tasks/:id/statut')
  updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateStatutDto,
    @Request() req: ReqUser,
  ) {
    return this.tasksService.updateStatut(id, dto.statut, req.user.sub);
  }

  // DELETE /tasks/:id — Supprimer une tâche
  @Delete('tasks/:id')
  remove(@Param('id') id: string, @Request() req: ReqUser) {
    return this.tasksService.remove(id, req.user.sub);
  }

  // POST /tasks/trigger-check — Test manuel (Admin/Dev)
@Post('tasks/trigger-check')
triggerCheck(@Request() req: ReqUser) {
  return this.tasksService.triggerOverdueCheck(req.user.sub);
}

// PATCH /tasks/:id/surplus — Accorder du surplus
@Patch('tasks/:id/surplus')
addSurplus(
  @Param('id') id: string,
  @Body('jours') jours: number,
  @Request() req: ReqUser,
) {
  return this.tasksService.addSurplus(id, Number(jours), req.user.sub);
}
}