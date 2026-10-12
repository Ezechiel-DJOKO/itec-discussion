import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { AddMemberDto } from './dto/add-member.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface ReqUser {
  user: { sub: string; email: string };
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // POST /projects — Créer un projet
  @Post()
  create(@Body() dto: CreateProjectDto, @Request() req: ReqUser) {
    return this.projectsService.create(dto, req.user.sub);
  }

  // GET /projects — Mes projets
  @Get()
  findMyProjects(@Request() req: ReqUser) {
    return this.projectsService.findMyProjects(req.user.sub);
  }

  // GET /projects/:id — Détail d'un projet
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: ReqUser) {
    return this.projectsService.findOne(id, req.user.sub);
  }

  // PUT /projects/:id — Modifier un projet
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Request() req: ReqUser,
  ) {
    return this.projectsService.update(id, dto, req.user.sub);
  }

  // DELETE /projects/:id — Archiver un projet
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: ReqUser) {
    return this.projectsService.remove(id, req.user.sub);
  }

  // POST /projects/:id/members — Ajouter un membre
  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @Request() req: ReqUser,
  ) {
    return this.projectsService.addMember(id, dto.userId, req.user.sub);
  }

  // DELETE /projects/:id/members/:userId — Retirer un membre
  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: ReqUser,
  ) {
    return this.projectsService.removeMember(id, userId, req.user.sub);
  }

  // POST /projects/:id/leave — Quitter un projet
  @Post(':id/leave')
  leave(@Param('id') id: string, @Request() req: ReqUser) {
    return this.projectsService.leaveProject(id, req.user.sub);
  }

    // PATCH /projects/:id/archive — Archiver
  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req: ReqUser) {
    return this.projectsService.archive(id, req.user.sub);
  }

    // PATCH /projects/:id/unarchive — Désarchiver
  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string, @Request() req: ReqUser) {
    return this.projectsService.unarchive(id, req.user.sub);
  }
}