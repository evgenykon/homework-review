import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../../generated/prisma/client';
import type { AuthService } from '../services/auth.service';
import type { ChatSessionService } from '../services/chat-session.service';
import type { GameService } from '../services/game.service';
import { getSessionUser } from './session';

export class GameController {
  constructor(
    private readonly games: GameService,
    private readonly sessions: ChatSessionService,
    private readonly auth: AuthService,
  ) {}

  list = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const session = await this.sessions.findAccessible(request.params.id, user);

    if (!session) {
      throw request.server.httpErrors.notFound('Session not found');
    }

    reply.send(await this.games.list(session.id));
  };

  create = async (
    request: FastifyRequest<{ Params: { id: string }; Body: { name?: unknown; words?: unknown } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireParent(request);
    const session = await this.sessions.findAccessible(request.params.id, user);

    if (!session) {
      throw request.server.httpErrors.notFound('Session not found');
    }

    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    const words = this.parseWords(request.body?.words);

    if (!name || words.length === 0) {
      throw request.server.httpErrors.badRequest('name and words are required');
    }

    reply.code(201).send(await this.games.create(session.id, user, name, words));
  };

  getDetail = async (
    request: FastifyRequest<{ Params: { gameId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const game = await this.findAccessibleGame(request.params.gameId, user);

    if (!game) {
      throw request.server.httpErrors.notFound('Game not found');
    }

    reply.send(this.games.getDetail(game));
  };

  update = async (
    request: FastifyRequest<{ Params: { gameId: string }; Body: { name?: unknown; words?: unknown } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireParent(request);
    const game = await this.findAccessibleGame(request.params.gameId, user);

    if (!game) {
      throw request.server.httpErrors.notFound('Game not found');
    }

    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    const words = this.parseWords(request.body?.words);

    if (!name || words.length === 0) {
      throw request.server.httpErrors.badRequest('name and words are required');
    }

    reply.send(await this.games.update(game, name, words));
  };

  remove = async (
    request: FastifyRequest<{ Params: { gameId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireParent(request);
    const game = await this.findAccessibleGame(request.params.gameId, user);

    if (!game) {
      throw request.server.httpErrors.notFound('Game not found');
    }

    await this.games.remove(game);
    reply.send({ ok: true });
  };

  start = async (
    request: FastifyRequest<{ Params: { gameId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireChild(request);
    const game = await this.findAccessibleGame(request.params.gameId, user);

    if (!game) {
      throw request.server.httpErrors.notFound('Game not found');
    }

    if (game.words.length === 0) {
      throw request.server.httpErrors.badRequest('Game has no words');
    }

    const task = await this.games.startAttempt(game, user);

    if (!task) {
      throw request.server.httpErrors.conflict('No attempts left');
    }

    reply.send(task);
  };

  attempt = async (
    request: FastifyRequest<{ Params: { gameId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const game = await this.findAccessibleGame(request.params.gameId, user);

    if (!game) {
      throw request.server.httpErrors.notFound('Game not found');
    }

    reply.send(await this.games.getAttempt(game));
  };

  attemptById = async (
    request: FastifyRequest<{ Params: { gameId: string; attemptId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const game = await this.findAccessibleGame(request.params.gameId, user);

    if (!game) {
      throw request.server.httpErrors.notFound('Game not found');
    }

    const task = await this.games.getAttemptById(game, request.params.attemptId);

    if (!task) {
      throw request.server.httpErrors.notFound('Attempt not found');
    }

    reply.send(task);
  };

  submit = async (
    request: FastifyRequest<{ Params: { gameId: string }; Body: { answers?: unknown } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireChild(request);
    const game = await this.findAccessibleGame(request.params.gameId, user);

    if (!game) {
      throw request.server.httpErrors.notFound('Game not found');
    }

    const answers = this.parseAnswers(request.body?.answers);

    if (answers.length !== game.words.length) {
      throw request.server.httpErrors.badRequest('answer every word');
    }

    const task = await this.games.submitAttempt(game, user, answers);

    if (!task) {
      throw request.server.httpErrors.conflict('Attempt is not active');
    }

    reply.send(task);
  };

  restart = async (
    request: FastifyRequest<{ Params: { gameId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireParent(request);
    const game = await this.findAccessibleGame(request.params.gameId, user);

    if (!game) {
      throw request.server.httpErrors.notFound('Game not found');
    }

    await this.games.restart(game, user);
    reply.send({ ok: true });
  };

  private parseWords(raw: unknown): { word: string; answer: string }[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item) => ({
        word: typeof item.word === 'string' ? item.word.trim() : '',
        answer: typeof item.answer === 'string' ? item.answer.trim() : '',
      }))
      .filter((item) => item.word && item.answer);
  }

  private parseAnswers(raw: unknown): { wordId: string; value: string }[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === 'object' && item !== null,
      )
      .map((item) => ({
        wordId: typeof item.wordId === 'string' ? item.wordId : '',
        value: typeof item.value === 'string' ? item.value : '',
      }))
      .filter((item) => item.wordId && item.value);
  }

  private async findAccessibleGame(gameId: string, user: User) {
    const game = await this.games.byId(gameId);

    if (!game) {
      return null;
    }

    const session = await this.sessions.findAccessible(game.sessionId, user);
    return session ? game : null;
  }

  private async requireUser(request: FastifyRequest): Promise<User> {
    const user = await getSessionUser(request, this.auth);

    if (!user) {
      throw request.server.httpErrors.unauthorized('Not authenticated');
    }

    return user;
  }

  private async requireParent(request: FastifyRequest): Promise<User> {
    const user = await this.requireUser(request);

    if (user.type !== 'parent') {
      throw request.server.httpErrors.forbidden('Parent only');
    }

    return user;
  }

  private async requireChild(request: FastifyRequest): Promise<User> {
    const user = await this.requireUser(request);

    if (user.type !== 'child') {
      throw request.server.httpErrors.forbidden('Child only');
    }

    return user;
  }
}
