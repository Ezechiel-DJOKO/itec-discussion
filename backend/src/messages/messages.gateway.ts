import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  // Chaque client rejoint sa room perso → notifs ciblées
  handleConnection(client: Socket) {
    try {
      const userId =
        (client.handshake.auth as any)?.userId ||
        (client.handshake.query as any)?.userId;
      if (userId) {
        client.join(`user_${userId}`);
      }
    } catch {}
  }

  // ─── MESSAGES PROJETS ───
  diffuserProjectMessage(projectId: string, message: any) {
    // 1. Met à jour la boîte de dialogue du chat si elle est ouverte
    this.server.emit(`project_${projectId}_message`, message);
    
    // 🔴 2. ALLUME LES PASTILLES ROUGES (Navbar & Bouton flottant)
    this.server.emit('receive_message', {
      id: message.id,
      message: message.message,
      projectId: projectId,
      senderId: message.userId,
      userId: message.userId,
      user: message.user,
      creeLe: message.creeLe,
    });
  }

  diffuserProjectMessageUpdate(projectId: string, message: any) {
    this.server.emit(`project_${projectId}_message_update`, message);
  }

  // ─── MESSAGES CHANNELS GLOBAUX ───
  diffuserChannelMessage(channel: string, message: any) {
    this.server.emit(`channel_${channel}_message`, message);
    
    // 🔴 2. ALLUME LES PASTILLES ROUGES
    this.server.emit('receive_message', {
      id: message.id,
      message: message.message,
      channelId: channel,
      senderId: message.userId,
      userId: message.userId,
      user: message.user,
      creeLe: message.creeLe,
    });
  }

  diffuserChannelMessageUpdate(channel: string, message: any) {
    this.server.emit(`channel_${channel}_message_update`, message);
  }

  // ─── COMMENTAIRES TÂCHES ───
  diffuserTaskComment(taskId: string, comment: any) {
    this.server.emit(`task_${taskId}_comment`, comment);
  }

  // ─── NOTIFICATIONS ───
  diffuserNotification(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('new_notification', notification);
    this.server.emit('new_notification', { ...notification, targetUserId: userId });
  }

  // ─── TYPING ───
  @SubscribeMessage('typing_start')
  handleTypingStart(@MessageBody() data: { room: string; userName: string }) {
    this.server.emit(`${data.room}_typing`, { userName: data.userName, isTyping: true });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(@MessageBody() data: { room: string; userName: string }) {
    this.server.emit(`${data.room}_typing`, { userName: data.userName, isTyping: false });
  }
}