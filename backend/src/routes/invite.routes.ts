import type { FastifyInstance } from 'fastify';
import type { InviteController } from '../controllers/invite.controller';

export class InviteRoutes {
  constructor(private readonly controller: InviteController) {}

  register(app: FastifyInstance): void {
    app.post('/invites', this.controller.create);
  }
}
