import type { FastifyInstance } from 'fastify';
import type { ChatController } from '../controllers/chat.controller';

export class ChatRoutes {
  constructor(private readonly controller: ChatController) {}

  register(app: FastifyInstance): void {
    app.get('/children/:childId/sessions', this.controller.listChildSessions);
    app.post('/children/:childId/sessions', this.controller.createSession);
    app.get('/sessions', this.controller.listMySessions);
    app.get('/sessions/archive', this.controller.listArchived);
    app.get('/sessions/:id', this.controller.getSession);
    app.get('/sessions/:id/messages', this.controller.listMessages);
    app.post('/sessions/:id/read', this.controller.markRead);
    app.post('/sessions/:id/review', this.controller.review);
    app.post('/sessions/:id/archive', this.controller.archive);
    app.post('/sessions/:id/restore', this.controller.restore);
    app.delete('/sessions/:id', this.controller.remove);
  }
}
