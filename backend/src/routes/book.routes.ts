import type { FastifyInstance } from 'fastify';
import type { BookController } from '../controllers/book.controller';

export class BookRoutes {
  constructor(private readonly controller: BookController) {}

  register(app: FastifyInstance): void {
    app.get('/books', this.controller.list);
    app.post('/books', this.controller.upload);
    app.get('/books/:id/file', this.controller.file);
    app.delete('/books/:id', this.controller.remove);
  }
}
