import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: 'http://localhost:3000', credentials: true },
})
export class MessagesGateway {
  @WebSocketServer()
  server: Server;

  // Diffuser un message dans le chat du projet
  diffuserProjectMessage(projectId: string, message: any) {
    this.server.emit(`project_${projectId}_message`, message);
  }

  // Diffuser un commentaire sous une tâche
  diffuserTaskComment(taskId: string, comment: any) {
    this.server.emit(`task_${taskId}_comment`, comment);
  }

    // 🔴 AJOUTER CETTE MÉTHODE :
  diffuserChannelMessage(channel: string, message: any) {
    this.server.emit(`channel_${channel}_message`, message);
  }
}