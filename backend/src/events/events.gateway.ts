import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emitEmailNew(threadTag: string, threadFullAddress: string, email: any) {
    this.server?.emit('email:new', {
      threadTag,
      threadFullAddress,
      email: {
        id: email.id,
        fromEmail: email.fromEmail,
        subject: email.subject,
        receivedAt: email.receivedAt,
        isRead: email.isRead,
        hasAttachments: false,
      },
    });
  }

  emitThreadNew(thread: any) {
    this.server?.emit('thread:new', { thread });
  }

  emitThreadDeleted(threadTag: string) {
    this.server?.emit('thread:deleted', { threadTag });
  }

  emitAllCleared() {
    this.server?.emit('all:cleared', { message: 'All data cleared' });
  }
}
