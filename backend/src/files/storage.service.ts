import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private isCloudinaryConfigured = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isCloudinaryConfigured = true;
    } else {
      this.logger.warn(
        '⚠️ Cloudinary non configuré. Les fichiers seront sauvegardés localement dans ./uploads/chat/',
      );
    }
  }

  async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    // Si Cloudinary est configuré, on essaye d'envoyer vers Cloudinary
    if (this.isCloudinaryConfigured) {
      try {
        return await this.uploadStreamToCloudinary(file);
      } catch (error) {
        this.logger.error(
          "Échec de l'upload Cloudinary, bascule sur le stockage local :",
          error,
        );
        return this.saveFileLocally(file);
      }
    }

    // Fallback : Sauvegarde locale si Cloudinary n'est pas configuré
    return this.saveFileLocally(file);
  }

  private uploadStreamToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const isAudio =
        file.mimetype.startsWith('audio') ||
        file.mimetype.includes('webm') ||
        file.mimetype.includes('ogg');
      const isVideo = file.mimetype.startsWith('video');
      const isImage = file.mimetype.startsWith('image');

      let resourceType = 'auto';
      if (isAudio || isVideo) resourceType = 'video';
      else if (isImage) resourceType = 'image';
      else resourceType = 'raw';

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'itec_discuss',
          resource_type: resourceType as any,
        },
        (error, result) => {
          if (error) return reject(error);
          if (result) resolve(result.secure_url);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  private saveFileLocally(file: Express.Multer.File): string {
    const uploadDir = path.join(process.cwd(), 'uploads', 'chat');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || this.getExtensionFromMime(file.mimetype);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    // Retourne le chemin relatif qui sera servi par notre FilesController
    return `/files/chat/${filename}`;
  }

  private getExtensionFromMime(mime: string): string {
    if (mime.includes('webm')) return '.webm';
    if (mime.includes('ogg')) return '.ogg';
    if (mime.includes('mp3') || mime.includes('mpeg')) return '.mp3';
    if (mime.includes('wav')) return '.wav';
    if (mime.includes('png')) return '.png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    return '';
  }
}