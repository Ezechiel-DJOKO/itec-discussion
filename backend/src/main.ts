import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean) as string[],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
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