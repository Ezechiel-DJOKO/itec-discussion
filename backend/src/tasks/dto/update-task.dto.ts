import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  IsArray,
} from 'class-validator';
import { TaskPriorite, TaskStatut } from '../entities/task.entity.js';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  titre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // 🔴 OBLIGATOIRE pour que le README soit accepté
  @IsOptional()
  @IsString()
  readme?: string;

  @IsOptional()
  @IsDateString()
  dateLimite?: string;

  @IsOptional()
  @IsEnum(TaskPriorite)
  priorite?: TaskPriorite;

  @IsOptional()
  @IsEnum(TaskStatut)
  statut?: TaskStatut;

  @IsOptional()
  @IsArray()
  assignesIds?: string[];
}