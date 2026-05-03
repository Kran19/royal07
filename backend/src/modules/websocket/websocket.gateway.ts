import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  // Track which socket belongs to which userId (set by client on connect via auth.userId)
  private userSocketMap = new Map<string, string>(); // userId -> socketId

  handleConnection(client: Socket) {
    client.join('global_room');

    // Client must send auth.userId when connecting so we can route payouts
    const userId = (client.handshake.auth as any)?.userId as string | undefined;
    if (userId) {
      this.userSocketMap.set(userId, client.id);
      this.logger.log(`User ${userId} connected via socket ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    // Clean up userId mapping on disconnect
    for (const [uid, sid] of this.userSocketMap.entries()) {
      if (sid === client.id) {
        this.userSocketMap.delete(uid);
        this.logger.log(`User ${uid} disconnected`);
        break;
      }
    }
  }

  /** Broadcast an event to ALL connected clients */
  broadcast(event: string, payload: any) {
    if (this.server) {
      this.server.emit(event, payload);
    }
  }

  /** Send an event to a SPECIFIC user only (e.g. balance_update after settlement) */
  broadcastToUser(userId: string, event: string, payload: any) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId && this.server) {
      this.server.to(socketId).emit(event, payload);
    } else {
      // User may not be connected right now — that's fine, they'll fetch on next login
      this.logger.warn(`broadcastToUser: user ${userId} not connected, skipping ${event}`);
    }
  }
}
