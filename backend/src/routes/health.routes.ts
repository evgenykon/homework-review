import type { FastifyInstance } from 'fastify';
import type { HealthController } from '../controllers/health.controller';

export class HealthRoutes {
  constructor(private readonly controller: HealthController) {}

  register(app: FastifyInstance): void {
    app.get('/health', this.controller.check);
  }
}
