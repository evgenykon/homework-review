import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, User } from '../../generated/prisma/client';
import type { AuthService } from '../services/auth.service';
import type { ChatSessionService } from '../services/chat-session.service';
import type { PageService } from '../services/page.service';
import { getSessionUser } from './session';

export class PageController {
  constructor(
    private readonly pages: PageService,
    private readonly sessions: ChatSessionService,
    private readonly auth: AuthService,
  ) {}

  upload = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const session = await this.sessions.findAccessible(request.params.id, user);

    if (!session) {
      throw request.server.httpErrors.notFound('Session not found');
    }

    const file = await request.file();

    if (!file) {
      throw request.server.httpErrors.badRequest('file is required');
    }

    const data = await file.toBuffer();
    const page = await this.pages.create(session.id, user, {
      fileName: file.filename,
      mimeType: file.mimetype,
      data,
    });

    reply.code(201).send(page);
  };

  list = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const session = await this.sessions.findAccessible(request.params.id, user);

    if (!session) {
      throw request.server.httpErrors.notFound('Session not found');
    }

    reply.send(await this.pages.list(session.id));
  };

  remove = async (
    request: FastifyRequest<{ Params: { pageId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const page = await this.pages.findAccessiblePage(request.params.pageId, user);

    if (!page) {
      throw request.server.httpErrors.notFound('Page not found');
    }

    await this.pages.remove(page);
    reply.send({ ok: true });
  };

  addStroke = async (
    request: FastifyRequest<{ Params: { pageId: string }; Body: { data?: unknown } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const page = await this.pages.findAccessiblePage(request.params.pageId, user);

    if (!page) {
      throw request.server.httpErrors.notFound('Page not found');
    }

    const data = request.body?.data;

    if (!data || typeof data !== 'object') {
      throw request.server.httpErrors.badRequest('data is required');
    }

    const stroke = await this.pages.addStroke(page, data as Prisma.InputJsonValue);
    reply.code(201).send(stroke);
  };

  removeStroke = async (
    request: FastifyRequest<{ Params: { strokeId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const removed = await this.pages.removeStroke(request.params.strokeId, user);

    if (!removed) {
      throw request.server.httpErrors.notFound('Stroke not found');
    }

    reply.send({ ok: true });
  };

  image = async (
    request: FastifyRequest<{ Params: { pageId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const page = await this.pages.findAccessiblePage(request.params.pageId, user);

    if (!page) {
      throw request.server.httpErrors.notFound('Image not found');
    }

    const image = await this.pages.readImage(page);

    if (!image) {
      throw request.server.httpErrors.notFound('Image not found');
    }

    reply
      .type(page.mimeType)
      .header('cache-control', 'private, max-age=31536000, immutable')
      .send(image);
  };

  private async requireUser(request: FastifyRequest): Promise<User> {
    const user = await getSessionUser(request, this.auth);

    if (!user) {
      throw request.server.httpErrors.unauthorized('Not authenticated');
    }

    return user;
  }
}
