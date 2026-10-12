import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface RequestAvecUser extends Request {
  user: { sub: string; email: string };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  async getProfile(@Request() req: RequestAvecUser) {
    const user = await this.usersService.findById(req.user.sub);
    const { motDePasse, ...result } = user;
    return result;
  }

  @Put('me')
  async updateProfile(@Request() req: RequestAvecUser, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(req.user.sub, dto);
    const { motDePasse, ...result } = user;
    return result;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

    // GET /users/me/stats — Rendement et Historique des pénalités
  @Get('me/stats')
  getMyStats(@Request() req: any) {
    return this.usersService.getUserStats(req.user.sub);
  }

  // POST /users/:id/penalty — Infliger une pénalité (Chef uniquement)
  @Post(':id/penalty')
  addPenalty(
    @Param('id') userId: string,
    @Body() body: { projectId: string; motif: string },
    @Request() req: any,
  ) {
    return this.usersService.addPenalty(body.projectId, userId, req.user.sub, body.motif);
  }
}