import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TaskPriorite } from '../entities/task.entity.js';

export class CreateTaskDto {
  @IsString()
  @MinLength(3, { message: 'Le titre doit contenir au moins 3 caractères' })
  @MaxLength(200)
  titre: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  readme?: string;

  @IsDateString({}, { message: 'Date limite invalide' })
  dateLimite: string;

  @IsOptional()
  @IsEnum(TaskPriorite, { message: 'Priorité invalide' })
  priorite?: TaskPriorite;

  @IsOptional()
  @IsUUID('4', { message: 'ID responsable invalide' })
  assigneAId?: string;
}