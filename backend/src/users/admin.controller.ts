import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AppPermission } from './entities/user.entity.js';

interface ReqUser {
  user: { sub: string; email: string };
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  // Helper interne : Vérifie que l'appelant est Super Admin
  private async assertSuperAdmin(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Accès réservé au Super Admin uniquement');
    }
  }

  // GET /admin/users — Liste complète des utilisateurs
  @Get()
  async getAllUsers(@Request() req: ReqUser) {
    await this.assertSuperAdmin(req.user.sub);
    return this.usersService.findAll();
  }

  // PATCH /admin/users/:id/toggle-actif — Désactiver / Réactiver
  @Patch(':id/toggle-actif')
  async toggleActif(@Param('id') id: string, @Request() req: ReqUser) {
    await this.assertSuperAdmin(req.user.sub);
    return this.usersService.toggleActif(id);
  }

  // PATCH /admin/users/:id/permission — Accorder / Retirer une permission
  @Patch(':id/permission')
  async togglePermission(
    @Param('id') id: string,
    @Body('permission') permission: AppPermission,
    @Request() req: ReqUser,
  ) {
    await this.assertSuperAdmin(req.user.sub);
    return this.usersService.togglePermission(id, permission);
  }

  // DELETE /admin/users/:id — Supprimer définitivement
  @Delete(':id')
  async hardDelete(@Param('id') id: string, @Request() req: ReqUser) {
    await this.assertSuperAdmin(req.user.sub);
    await this.usersService.hardDelete(id);
    return { message: 'Utilisateur supprimé définitivement' };
  }
}