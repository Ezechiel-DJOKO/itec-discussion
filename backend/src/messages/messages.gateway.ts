import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class MessagesGateway {
  @WebSocketServer()
  server: Server;

  diffuserProjectMessage(projectId: string, message: any) {
    this.server.emit(`project_${projectId}_message`, message);
  }
  diffuserProjectMessageUpdate(projectId: string, message: any) {
    this.server.emit(`project_${projectId}_message_update`, message);
  }
  diffuserChannelMessage(channel: string, message: any) {
    this.server.emit(`channel_${channel}_message`, message);
  }
  diffuserChannelMessageUpdate(channel: string, message: any) {
    this.server.emit(`channel_${channel}_message_update`, message);
  }
  diffuserTaskComment(taskId: string, comment: any) {
    this.server.emit(`task_${taskId}_comment`, comment);
  }
}