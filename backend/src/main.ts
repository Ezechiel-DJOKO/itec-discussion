import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activation CORS pour que Next.js (port 3000) puisse parler à NestJS (port 3001)
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // Validation automatique des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend lancé sur http://localhost:${port}`);
}
bootstrap();