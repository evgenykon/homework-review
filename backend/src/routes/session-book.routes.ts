import type { FastifyInstance } from 'fastify';
import type { SessionBookController } from '../controllers/session-book.controller';

export class SessionBookRoutes {
  constructor(private readonly controller: SessionBookController) {}

  register(app: FastifyInstance): void {
    app.get('/sessions/:id/books', this.controller.list);
    app.put('/sessions/:id/books', this.controller.sync);
  }
}
