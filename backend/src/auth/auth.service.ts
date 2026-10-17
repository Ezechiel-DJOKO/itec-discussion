import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // INSCRIPTION
  async register(dto: RegisterDto) {
    const user = await this.usersService.create(
      dto.nom,
      dto.email,
      dto.motDePasse,
    );

    const { motDePasse, ...result } = user;
    const token = this.generateToken(user.id, user.email);

    return {
      message: 'Inscription réussie ! Bienvenue 🎉',
      utilisateur: result,
      user: result,
      token,
      access_token: token,
    };
  }

  // CONNEXION
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Ne bloque que si le compte est explicitement désactivé (false)
    if (user.actif === false) {
      throw new UnauthorizedException('Ce compte a été désactivé');
    }

    const valide = await bcrypt.compare(dto.motDePasse, user.motDePasse);
    if (!valide) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const { motDePasse, ...result } = user;
    const token = this.generateToken(user.id, user.email);

    return {
      message: 'Connexion réussie !',
      utilisateur: result,
      user: result,
      token,
      access_token: token,
    };
  }

  // Générer le JWT
  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}