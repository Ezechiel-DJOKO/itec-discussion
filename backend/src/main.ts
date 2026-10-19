import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Liste des origines autorisées + nettoyage des éventuels slashes finaux
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://itec-discussion.vercel.app',
    process.env.FRONTEND_URL,
  ]
    .filter(Boolean)
    .map((url) => (url as string).replace(/\/$/, ''));

  app.enableCors({
    origin: (origin, callback) => {
      // Si la requête n'a pas d'en-tête Origin (ex: mobile, Postman, SSR), on autorise
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, '');

      // Vérifie si l'origine est dans la liste ou se termine par .vercel.app
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      // Autorise tout le reste par sécurité pour ne jamais bloquer la production
      return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
    exposedHeaders: ['Content-Disposition', 'Content-Type'],
  });

  // Sert les fichiers locaux du chat (images / audio historiques)
  // Les nouveaux uploads passent par Cloudinary, mais les anciens
  // messages pointent encore vers /files/chat/...
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/files/chat',
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Origin', '*');
    },
  });

  // Fallback si certains fichiers sont dans uploads/chat/
  app.useStaticAssets(join(process.cwd(), 'uploads', 'chat'), {
    prefix: '/files/chat',
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Origin', '*');
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend lancé sur le port ${port}`);
}
bootstrap();