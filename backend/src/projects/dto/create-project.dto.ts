import {
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  IsArray,
  IsUUID,
  ArrayMaxSize,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(3, { message: 'Le nom doit contenir au moins 3 caractères' })
  @MaxLength(150)
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString({}, { message: 'Date de début invalide' })
  dateDebut: string;

  @IsDateString({}, { message: 'Date de fin invalide' })
  dateFin: string;

  // IDs des membres à inviter (hors créateur)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'ID membre invalide' })
  @ArrayMaxSize(19, { message: 'Maximum 19 membres (+ vous = 20)' })
  membresIds?: string[];
}