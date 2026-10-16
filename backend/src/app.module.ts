import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { FilesModule } from './files/files.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { ActivityLogsModule } from './activity-logs/activity-logs.module.js';
import { MessagesModule } from './messages/messages.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: false,
        // 🔴 OBLIGATOIRE POUR SUPABASE EN PRODUCTION :
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    FilesModule,
    NotificationsModule,
    ActivityLogsModule,
    MessagesModule
  ],
})
export class AppModule {}