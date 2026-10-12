import { IsUUID } from 'class-validator';

export class AddMemberDto {
  @IsUUID('4', { message: 'ID utilisateur invalide' })
  userId: string;
}