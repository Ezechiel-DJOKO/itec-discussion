import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseUUIDPipe,
  Query,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FilesService } from './files.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { StorageService } from './storage.service.js';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';

interface ReqUser {
  user: { sub: string; email: string };
}

const ALLOWED_MIMES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
  'text/plain',
  'text/csv',
  // Audio
  'audio/webm',
  'audio/ogg',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
];

const ALLOWED_EXTS = [
  '.zip', '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.png', '.jpg', '.jpeg', '.gif', '.txt', '.csv',
  // Audio
  '.webm', '.ogg', '.mp3', '.wav',
];

@Controller()
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly storageService: StorageService,
    private readonly jwtService: JwtService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // GET /files/chat/:filename — Sert un fichier chat
  // Auth via ?token= car <img>/<audio> n'envoient pas Authorization
  // ═══════════════════════════════════════════════════════════
  @Get('files/chat/:filename')
  async serveChatFile(
    @Param('filename') filename: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    // Sécurité anti path-traversal
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new NotFoundException('Fichier invalide');
    }

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    // Cherche dans uploads/ puis uploads/chat/
    const candidates = [
      join(process.cwd(), 'uploads', filename),
      join(process.cwd(), 'uploads', 'chat', filename),
    ];

    const filePath = candidates.find((p) => fs.existsSync(p));
    if (!filePath) {
      throw new NotFoundException('Fichier introuvable');
    }

    // Headers CORS / CORP pour éviter OpaqueResponseBlocking
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    return res.sendFile(filePath);
  }

  // ═══════════════════════════════════════════════════════════
  // POST /tasks/:taskId/files — Upload fichier de tâche
  // ═══════════════════════════════════════════════════════════
  @Post('tasks/:taskId/files')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, unique);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (
          ALLOWED_EXTS.includes(ext) ||
          ALLOWED_MIMES.includes(file.mimetype)
        ) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `Format non autorisé. Formats acceptés : ${ALLOWED_EXTS.join(', ')}`,
            ) as any,
            false,
          );
        }
      },
    }),
  )
  upload(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: ReqUser,
  ) {
    return this.filesService.upload(taskId, file, req.user.sub);
  }

  // ═══════════════════════════════════════════════════════════
  // GET /tasks/:taskId/files — Lister les fichiers d'une tâche
  // ═══════════════════════════════════════════════════════════
  @Get('tasks/:taskId/files')
  @UseGuards(JwtAuthGuard)
  findByTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Request() req: ReqUser,
  ) {
    return this.filesService.findByTask(taskId, req.user.sub);
  }

  // ═══════════════════════════════════════════════════════════
  // GET /files/:id/download — Télécharger un fichier de tâche
  // ═══════════════════════════════════════════════════════════
  @Get('files/:id/download')
  @UseGuards(JwtAuthGuard)
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ReqUser,
    @Res() res: Response,
  ) {
    const { file, absolutePath } = await this.filesService.getFileForDownload(
      id,
      req.user.sub,
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.nomOriginal)}"`,
    );
    res.setHeader('Content-Type', file.mimetype);
    return res.sendFile(absolutePath);
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE /files/:id — Supprimer un fichier
  // ═══════════════════════════════════════════════════════════
  @Delete('files/:id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ReqUser,
  ) {
    return this.filesService.remove(id, req.user.sub);
  }

  // ═══════════════════════════════════════════════════════════
  // POST /files/chat/upload — Upload chat → Cloudinary
  // ═══════════════════════════════════════════════════════════
  @Post('files/chat/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
    }),
  )
  async uploadChatFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Aucun fichier fourni');
    const url = await this.storageService.uploadToCloudinary(file);
    // Toujours une URL absolue (https://res.cloudinary.com/...)
    return { url };
  }
}