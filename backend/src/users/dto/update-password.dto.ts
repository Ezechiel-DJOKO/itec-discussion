import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @MinLength(6, { message: "Le mot de passe doit contenir au moins 6 caractères" })
  ancienMotDePasse: string;

  @IsString()
  @MinLength(6, { message: "Le nouveau mot de passe doit contenir au moins 6 caractères" })
  nouveauMotDePasse: string;
}