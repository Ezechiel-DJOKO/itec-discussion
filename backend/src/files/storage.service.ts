import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      // Déterminer le type de ressource pour Cloudinary
      const isAudio = file.mimetype.startsWith('audio') || file.mimetype.includes('webm') || file.mimetype.includes('ogg');
      const isVideo = file.mimetype.startsWith('video');
      const isImage = file.mimetype.startsWith('image');
      
      let resourceType = 'auto';
      if (isAudio || isVideo) resourceType = 'video';
      else if (isImage) resourceType = 'image';
      else resourceType = 'raw'; // Pour PDF, ZIP, DOCX...

      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'itec_discuss', 
          resource_type: resourceType as any 
        },
        (error, result) => {
          if (error) return reject(new InternalServerErrorException("Erreur d'upload Cloudinary"));
          if (result) resolve(result.secure_url);
        }
      );

      // Convertir le buffer en mémoire vers un flux lisible
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}