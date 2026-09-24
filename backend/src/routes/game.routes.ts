import type { FastifyInstance } from 'fastify';
import type { GameController } from '../controllers/game.controller';

export class GameRoutes {
  constructor(private readonly controller: GameController) {}

  register(app: FastifyInstance): void {
    app.get('/sessions/:id/games', this.controller.list);
    app.post('/sessions/:id/games', this.controller.create);

    app.get('/games/:gameId', this.controller.getDetail);
    app.put('/games/:gameId', this.controller.update);
    app.delete('/games/:gameId', this.controller.remove);

    app.get('/games/:gameId/attempt', this.controller.attempt);
    app.post('/games/:gameId/attempts', this.controller.start);
    app.post('/games/:gameId/attempt', this.controller.submit);
    app.post('/games/:gameId/restart', this.controller.restart);
  }
}
