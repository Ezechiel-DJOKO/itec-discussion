import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatut } from './entities/project.entity.js';
import { ProjectMember, MemberRole } from './entities/project-member.entity.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    private readonly usersService: UsersService,
  ) {}

  // ─── CRÉER UN PROJET ───────────────────────────────────
  async create(dto: CreateProjectDto, userId: string): Promise<Project> {
    if (new Date(dto.dateFin) <= new Date(dto.dateDebut)) {
      throw new BadRequestException(
        'La date de fin doit être après la date de début',
      );
    }

    const project = this.projectRepo.create({
      nom: dto.nom,
      description: dto.description,
      dateDebut: dto.dateDebut,
      dateFin: dto.dateFin,
      createdById: userId,
    });

    const saved = await this.projectRepo.save(project);

    // Ajouter le créateur comme CHEF
    await this.memberRepo.save(
      this.memberRepo.create({
        projectId: saved.id,
        userId,
        role: MemberRole.CHEF,
      }),
    );

    // Ajouter les membres invités
    if (dto.membresIds && dto.membresIds.length > 0) {
      // Filtrer pour ne pas se ré-ajouter soi-même
      const idsUniques = [...new Set(dto.membresIds)].filter(
        (id) => id !== userId,
      );

      for (const membreId of idsUniques) {
        // Vérifier que l'utilisateur existe
        await this.usersService.findById(membreId);
        await this.memberRepo.save(
          this.memberRepo.create({
            projectId: saved.id,
            userId: membreId,
            role: MemberRole.MEMBRE,
          }),
        );
      }
    }

    return this.findOne(saved.id, userId);
  }

    // ─── MES PROJETS (ceux où je suis membre) ─────────────
  async findMyProjects(userId: string): Promise<Project[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      select: {
        projectId: true,
      },
    });

    if (memberships.length === 0) return [];

    const projectIds = memberships.map((m) => m.projectId);

    return this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.createur', 'createur')
      .leftJoinAndSelect('project.membres', 'membres')
      .leftJoinAndSelect('membres.user', 'user')
      .where('project.id IN (:...projectIds)', { projectIds })
      .orderBy('project.creeLe', 'DESC')
      .getMany();
  }

    // ─── DÉTAIL D'UN PROJET ────────────────────────────────
  async findOne(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: {
        createur: true,
        membres: {
          user: true,
        },
      },
    });

    if (!project) throw new NotFoundException('Projet introuvable');

    // Vérifier que l'utilisateur est membre
    const isMember = project.membres.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException("Vous n'êtes pas membre de ce projet");
    }

    return project;
  }

  // ─── MODIFIER UN PROJET (Chef uniquement) ─────────────
  async update(
    projectId: string,
    dto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    await this.assertIsChef(projectId, userId);

    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    if (dto.dateDebut && dto.dateFin) {
      if (new Date(dto.dateFin) <= new Date(dto.dateDebut)) {
        throw new BadRequestException(
          'La date de fin doit être après la date de début',
        );
      }
    }

    Object.assign(project, dto);
    await this.projectRepo.save(project);

    return this.findOne(projectId, userId);
  }

  // ─── ARCHIVER UN PROJET (Chef uniquement) ─────────────
  async archive(projectId: string, userId: string): Promise<{ message: string }> {
    await this.assertIsChef(projectId, userId);

    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable');

    project.statut = ProjectStatut.ARCHIVE;
    await this.projectRepo.save(project);

    return { message: 'Projet archivé avec succès' };
  }

    // ─── DÉSARCHIVER UN PROJET (Chef uniquement) ──────────
  async unarchive(projectId: string, userId: string): Promise<{ message: string }> {
    await this.assertIsChef(projectId, userId);

    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable');

    // On remet le projet "en cours"
    project.statut = ProjectStatut.EN_COURS;
    await this.projectRepo.save(project);

    return { message: 'Projet réactivé avec succès' };
  }

    // ─── SUPPRIMER UN PROJET (Chef uniquement) ─
  async remove(projectId: string, userId: string): Promise<{ message: string }> {
    await this.assertIsChef(projectId, userId);

    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    // On supprime vraiment de la base de données
    await this.projectRepo.remove(project);

    return { message: 'Projet supprimé définitivement' };
  }

  // ─── AJOUTER UN MEMBRE (Chef uniquement) ──────────────
  async addMember(
    projectId: string,
    newUserId: string,
    chefId: string,
  ): Promise<Project> {
    await this.assertIsChef(projectId, chefId);

    // Vérifier limite de 20
    const count = await this.memberRepo.count({ where: { projectId } });
    if (count >= 20) {
      throw new BadRequestException('Limite de 20 membres atteinte');
    }

    // Vérifier que l'user existe
    await this.usersService.findById(newUserId);

    // Vérifier qu'il n'est pas déjà membre
    const existant = await this.memberRepo.findOne({
      where: { projectId, userId: newUserId },
    });
    if (existant) {
      throw new ConflictException('Cet utilisateur est déjà membre du projet');
    }

    await this.memberRepo.save(
      this.memberRepo.create({
        projectId,
        userId: newUserId,
        role: MemberRole.MEMBRE,
      }),
    );

    return this.findOne(projectId, chefId);
  }

  // ─── RETIRER UN MEMBRE (Chef uniquement) ──────────────
  async removeMember(
    projectId: string,
    targetUserId: string,
    chefId: string,
  ): Promise<Project> {
    await this.assertIsChef(projectId, chefId);

    if (targetUserId === chefId) {
      throw new BadRequestException(
        'Le chef de projet ne peut pas se retirer lui-même',
      );
    }

    const member = await this.memberRepo.findOne({
      where: { projectId, userId: targetUserId },
    });
    if (!member) {
      throw new NotFoundException('Membre introuvable dans ce projet');
    }

    await this.memberRepo.remove(member);
    return this.findOne(projectId, chefId);
  }

  // ─── QUITTER UN PROJET (Membre) ───────────────────────
  async leaveProject(
    projectId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const member = await this.memberRepo.findOne({
      where: { projectId, userId },
    });
    if (!member) {
      throw new NotFoundException('Vous n\'êtes pas membre de ce projet');
    }

    if (member.role === MemberRole.CHEF) {
      throw new BadRequestException(
        'Le chef de projet ne peut pas quitter. Archivez le projet ou transférez le rôle.',
      );
    }

    await this.memberRepo.remove(member);
    return { message: 'Vous avez quitté le projet' };
  }

  // ─── HELPER : vérifier que l'user est chef ────────────
  private async assertIsChef(projectId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { projectId, userId },
    });

    if (!member) {
      throw new ForbiddenException("Vous n'êtes pas membre de ce projet");
    }
    if (member.role !== MemberRole.CHEF) {
      throw new ForbiddenException(
        'Seul le chef de projet peut effectuer cette action',
      );
    }
  }
}