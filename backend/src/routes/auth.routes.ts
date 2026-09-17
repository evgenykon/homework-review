import type { FastifyInstance } from 'fastify';
import type { AuthController } from '../controllers/auth.controller';

export class AuthRoutes {
  constructor(private readonly controller: AuthController) {}

  register(app: FastifyInstance): void {
    app.get('/auth/yandex', this.controller.startYandex);
    app.get('/auth/yandex/callback', this.controller.callbackYandex);
    app.get('/auth/me', this.controller.me);
    app.post('/auth/logout', this.controller.logout);
  }
}
