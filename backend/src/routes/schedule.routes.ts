import type { FastifyInstance } from 'fastify';
import type { ScheduleController } from '../controllers/schedule.controller';

export class ScheduleRoutes {
  constructor(private readonly controller: ScheduleController) {}

  register(app: FastifyInstance): void {
    app.get('/schedule', this.controller.get);
    app.put('/schedule', this.controller.update);
  }
}
