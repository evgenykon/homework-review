import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../../generated/prisma/client';
import type { AuthService } from '../services/auth.service';
import type { ChatSessionService } from '../services/chat-session.service';
import type { SessionBookService } from '../services/session-book.service';
import { getSessionUser } from './session';

export class SessionBookController {
  constructor(
    private readonly sessionBooks: SessionBookService,
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

    reply.send(await this.sessionBooks.list(session.id));
  };

  sync = async (
    request: FastifyRequest<{ Params: { id: string }; Body: { bookIds?: unknown } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const session = await this.sessions.findAccessible(request.params.id, user);

    if (!session) {
      throw request.server.httpErrors.notFound('Session not found');
    }

    const raw = Array.isArray(request.body?.bookIds) ? request.body.bookIds : [];
    const bookIds = raw.filter((id): id is string => typeof id === 'string');

    reply.send(await this.sessionBooks.sync(session.id, user, bookIds));
  };

  private async requireUser(request: FastifyRequest): Promise<User> {
    const user = await getSessionUser(request, this.auth);

    if (!user) {
      throw request.server.httpErrors.unauthorized('Not authenticated');
    }

    return user;
  }
}
