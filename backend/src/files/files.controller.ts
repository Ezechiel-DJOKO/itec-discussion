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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FilesService } from './files.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import * as fs from 'fs';
import * as path from 'path';
import { NotFoundException } from '@nestjs/common';

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
  // 🔴 AJOUTS POUR L'AUDIO
  'audio/webm',
  'audio/ogg',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav'
];

const ALLOWED_EXTS = [
  '.zip', '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.png', '.jpg', '.jpeg', '.gif', '.txt', '.csv',
  // 🔴 AJOUTS POUR L'AUDIO
  '.webm', '.ogg', '.mp3', '.wav'
];

@Controller()
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // POST /tasks/:taskId/files — Upload
  @Post('tasks/:taskId/files')
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

  // GET /tasks/:taskId/files — Lister
  @Get('tasks/:taskId/files')
  findByTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Request() req: ReqUser,
  ) {
    return this.filesService.findByTask(taskId, req.user.sub);
  }

  // GET /files/:id/download — Télécharger
  @Get('files/:id/download')
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

  // DELETE /files/:id — Supprimer
  @Delete('files/:id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ReqUser,
  ) {
    return this.filesService.remove(id, req.user.sub);
  }

    // ─── UPLOAD DE FICHIER GÉNÉRIQUE (POUR LE CHAT) ───
  @Post('files/chat/upload')
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
    }),
  )
  uploadChatFile(@UploadedFile() file: Express.Multer.File) {
    // Retourne simplement l'URL locale du fichier
    return { url: `/files/chat/${file.filename}` };
  }

  // ─── LECTURE / STREAMING DE FICHIER CHAT ───
  @Get('files/chat/:filename')
  serveChatFile(@Param('filename') filename: string, @Res() res: Response) {
    const absolutePath = path.join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Fichier introuvable');
    }
    // Permet au navigateur de lire directement le fichier (ex: audio)
    return res.sendFile(absolutePath);
  }
}