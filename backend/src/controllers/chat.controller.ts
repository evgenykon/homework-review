import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../../generated/prisma/client';
import type { AuthService } from '../services/auth.service';
import type { ChatService } from '../services/chat.service';
import type { ChatSessionService } from '../services/chat-session.service';
import { getSessionUser } from './session';

export class ChatController {
  constructor(
    private readonly sessions: ChatSessionService,
    private readonly chat: ChatService,
    private readonly auth: AuthService,
  ) {}

  createSession = async (
    request: FastifyRequest<{ Params: { childId: string }; Body: { name?: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const parent = await this.requireParent(request);
    const name = request.body?.name?.trim();

    if (!name) {
      throw request.server.httpErrors.badRequest('name is required');
    }

    const session = await this.sessions.createForChild(parent.id, request.params.childId, name);

    if (!session) {
      throw request.server.httpErrors.notFound('Child not found');
    }

    reply.code(201).send(session);
  };

  listChildSessions = async (
    request: FastifyRequest<{ Params: { childId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const parent = await this.requireParent(request);
    reply.send(await this.sessions.listForChild(parent.id, request.params.childId));
  };

  listMySessions = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await this.requireUser(request);
    reply.send(await this.sessions.listForUser(user));
  };

  getSession = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const session = await this.sessions.findAccessible(request.params.id, user);

    if (!session) {
      throw request.server.httpErrors.notFound('Session not found');
    }

    reply.send(session);
  };

  listMessages = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const session = await this.sessions.findAccessible(request.params.id, user);

    if (!session) {
      throw request.server.httpErrors.notFound('Session not found');
    }

    reply.send(await this.chat.listMessages(session.id));
  };

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
      throw request.server.httpErrors.forbidden('Only parents allowed');
    }

    return user;
  }
}
