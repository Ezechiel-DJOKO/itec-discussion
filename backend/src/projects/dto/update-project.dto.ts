import {
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ProjectStatut } from '../entities/project.entity.js';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @IsOptional()
  @IsEnum(ProjectStatut)
  statut?: ProjectStatut;
}