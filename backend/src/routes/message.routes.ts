import type { FastifyInstance } from 'fastify';
import type { MessageController } from '../controllers/message.controller';

export class MessageRoutes {
  constructor(private readonly controller: MessageController) {}

  register(app: FastifyInstance): void {
    app.get('/messages', this.controller.list);
    app.post<{ Body: { body?: string } }>('/messages', this.controller.create);
  }
}
