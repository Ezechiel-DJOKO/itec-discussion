import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskStatut } from '../entities/task.entity.js';

export class UpdateStatutDto {
  @IsEnum(TaskStatut, { message: 'Statut invalide' })
  statut: TaskStatut;

  @IsOptional()
  @IsString()
  readme?: string;
}