import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class MessagesGateway {
  @WebSocketServer()
  server: Server;

  // ─── MESSAGES PROJETS ───
  diffuserProjectMessage(projectId: string, message: any) {
    this.server.emit(`project_${projectId}_message`, message);
  }

  diffuserProjectMessageUpdate(projectId: string, message: any) {
    this.server.emit(`project_${projectId}_message_update`, message);
  }

  // ─── MESSAGES CHANNELS GLOBAUX ───
  diffuserChannelMessage(channel: string, message: any) {
    this.server.emit(`channel_${channel}_message`, message);
  }

  diffuserChannelMessageUpdate(channel: string, message: any) {
    this.server.emit(`channel_${channel}_message_update`, message);
  }

  // ─── COMMENTAIRES TÂCHES ───
  diffuserTaskComment(taskId: string, comment: any) {
    this.server.emit(`task_${taskId}_comment`, comment);
  }

  // 🔴 NOUVEAU : GESTION DU "TYPING..." (En train d'écrire)
  
  @SubscribeMessage('typing_start')
  handleTypingStart(@MessageBody() data: { room: string; userName: string }) {
    // Diffuse à tout le monde dans la room SAUF l'expéditeur
    this.server.emit(`${data.room}_typing`, { userName: data.userName, isTyping: true });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(@MessageBody() data: { room: string; userName: string }) {
    this.server.emit(`${data.room}_typing`, { userName: data.userName, isTyping: false });
  }
}