import type { FastifyInstance } from 'fastify';
import type { ChildController } from '../controllers/child.controller';

export class ChildRoutes {
  constructor(private readonly controller: ChildController) {}

  register(app: FastifyInstance): void {
    app.get('/children', this.controller.list);
    app.get('/children/:id', this.controller.get);
    app.delete('/children/:id', this.controller.remove);
  }
}
