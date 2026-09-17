import type { FastifyInstance } from 'fastify';
import type { PageController } from '../controllers/page.controller';

export class PageRoutes {
  constructor(private readonly controller: PageController) {}

  register(app: FastifyInstance): void {
    app.get('/sessions/:id/pages', this.controller.list);
    app.post('/sessions/:id/pages', this.controller.upload);
    app.delete('/pages/:pageId', this.controller.remove);
    app.post('/pages/:pageId/strokes', this.controller.addStroke);
    app.delete('/strokes/:strokeId', this.controller.removeStroke);
    app.get('/pages/:pageId/image', this.controller.image);
  }
}
