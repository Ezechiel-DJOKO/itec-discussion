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
import { User, AppPermission } from '../users/entities/user.entity.js';

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
    const user: any = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const isSuperAdmin = user.isSuperAdmin === true;
    const isResponsableOrAdmin =
      user.isResponsable === true ||
      user.role === 'admin' ||
      user.role === 'responsable';

    const hasPermission =
      user.permissions?.includes(AppPermission.CAN_CREATE_PROJECT) ||
      user.permissions?.includes(AppPermission.CAN_ACCESS_QG);

    if (!isSuperAdmin && !isResponsableOrAdmin && !hasPermission) {
      throw new ForbiddenException(
        'Seuls les responsables et administrateurs du QG peuvent créer un projet.',
      );
    }

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
      statut: ProjectStatut.EN_COURS,
      createur: { id: userId } as any,
    });

    const saved = await this.projectRepo.save(project);

    const membership = this.memberRepo.create({
      projectId: saved.id,
      userId: userId,
      role: MemberRole.CHEF,
    });
    await this.memberRepo.save(membership);

    const finalProject = await this.projectRepo.findOne({
      where: { id: saved.id },
      relations: {
        createur: true,
        membres: {
          user: true,
        },
      },
    });

    return finalProject as Project;
  }

  // ─── MES PROJETS (Récupération sécurisée et complète) ───
  async findMyProjects(userId: string): Promise<Project[]> {
    const user: any = await this.usersService.findById(userId);

    // 1. Si SuperAdmin, Admin ou Responsable -> Voir TOUS les projets
    const isAdminOrResponsable =
      user?.isSuperAdmin === true ||
      user?.isResponsable === true ||
      user?.role === 'admin' ||
      user?.role === 'responsable' ||
      user?.permissions?.includes(AppPermission.CAN_ACCESS_QG);

    if (isAdminOrResponsable) {
      return this.projectRepo.find({
        relations: {
          createur: true,
          membres: {
            user: true,
          },
        },
        order: { creeLe: 'DESC' },
      });
    }

    // 2. Sinon -> Voir les projets dont l'utilisateur est Membre OU Créateur
    return this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.createur', 'createur')
      .leftJoinAndSelect('project.membres', 'membres')
      .leftJoinAndSelect('membres.user', 'user')
      .where('membres.userId = :userId OR createur.id = :userId', { userId })
      .orderBy('project.creeLe', 'DESC')
      .getMany();
  }

  // ─── ALIAS FINDALL (Pour compatibilité si appelé par le contrôleur) ──
  async findAll(userId?: string): Promise<Project[]> {
    if (userId) {
      return this.findMyProjects(userId);
    }
    return this.projectRepo.find({
      relations: {
        createur: true,
        membres: {
          user: true,
        },
      },
      order: { creeLe: 'DESC' },
    });
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

    const user: any = await this.usersService.findById(userId);
    const isAdminOrResponsable =
      user?.isSuperAdmin === true ||
      user?.isResponsable === true ||
      user?.role === 'admin' ||
      user?.role === 'responsable' ||
      user?.permissions?.includes(AppPermission.CAN_ACCESS_QG);

    const isMember = project.membres?.some((m) => m.userId === userId);
    const isCreator = project.createur?.id === userId;

    if (!isMember && !isCreator && !isAdminOrResponsable) {
      throw new ForbiddenException("Vous n'êtes pas membre de ce projet");
    }

    return project;
  }

  // ─── MODIFIER UN PROJET (Chef / Admin) ────────────────
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

  // ─── ARCHIVER UN PROJET ───────────────────────────────
  async archive(projectId: string, userId: string): Promise<{ message: string }> {
    await this.assertIsChef(projectId, userId);
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable');

    project.statut = ProjectStatut.ARCHIVE;
    await this.projectRepo.save(project);
    return { message: 'Projet archivé avec succès' };
  }

  // ─── DÉSARCHIVER UN PROJET ────────────────────────────
  async unarchive(projectId: string, userId: string): Promise<{ message: string }> {
    await this.assertIsChef(projectId, userId);
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable');

    project.statut = ProjectStatut.EN_COURS;
    await this.projectRepo.save(project);
    return { message: 'Projet réactivé avec succès' };
  }

  // ─── SUPPRIMER UN PROJET ──────────────────────────────
  async remove(projectId: string, userId: string): Promise<{ message: string }> {
    await this.assertIsChef(projectId, userId);
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    await this.projectRepo.remove(project);
    return { message: 'Projet supprimé définitivement' };
  }

  // ─── AJOUTER UN MEMBRE ────────────────────────────────
  async addMember(
    projectId: string,
    newUserId: string,
    chefId: string,
  ): Promise<Project> {
    await this.assertIsChef(projectId, chefId);

    const count = await this.memberRepo.count({ where: { projectId } });
    if (count >= 20) {
      throw new BadRequestException('Limite de 20 membres atteinte');
    }

    await this.usersService.findById(newUserId);

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

  // ─── RETIRER UN MEMBRE ────────────────────────────────
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

  // ─── QUITTER UN PROJET ────────────────────────────────
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

  // ─── HELPER : Vérifier les droits d'administration ──────
  private async assertIsChef(projectId: string, userId: string): Promise<void> {
    const user: any = await this.usersService.findById(userId);

    // Les Admins et Responsables ont les droits de gestion complets
    if (
      user?.isSuperAdmin === true ||
      user?.isResponsable === true ||
      user?.role === 'admin' ||
      user?.role === 'responsable'
    ) {
      return;
    }

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