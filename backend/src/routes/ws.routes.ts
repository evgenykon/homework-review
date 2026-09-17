import type { FastifyInstance } from 'fastify';
import type { SocketHandler } from '../handlers/socket.handler';

export class WsRoutes {
  constructor(private readonly handler: SocketHandler) {}

  register(app: FastifyInstance): void {
    app.get('/ws', { websocket: true }, (socket, request) => {
      void this.handler.handleConnection(socket, request);
    });
  }
}
