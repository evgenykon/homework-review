import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../../generated/prisma/client';
import type { AuthService } from '../services/auth.service';
import type { BookService } from '../services/book.service';
import { getSessionUser } from './session';

export class BookController {
  constructor(
    private readonly books: BookService,
    private readonly auth: AuthService,
  ) {}

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await this.requireUser(request);
    reply.send(await this.books.list(user));
  };

  upload = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await this.requireUser(request);

    let title = '';
    let file: { fileName: string; mimeType: string; data: Buffer } | null = null;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        file = {
          fileName: part.filename,
          mimeType: part.mimetype,
          data: await part.toBuffer(),
        };
      } else if (part.fieldname === 'title') {
        title = String(part.value).trim();
      }
    }

    if (!file) {
      throw request.server.httpErrors.badRequest('file is required');
    }

    const book = await this.books.create(user, {
      title: title || file.fileName,
      fileName: file.fileName,
      mimeType: file.mimeType,
      data: file.data,
    });

    reply.code(201).send(book);
  };

  remove = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const book = await this.books.findAccessible(request.params.id, user);

    if (!book) {
      throw request.server.httpErrors.notFound('Book not found');
    }

    await this.books.remove(book);
    reply.send({ ok: true });
  };

  file = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireUser(request);
    const book = await this.books.findAccessible(request.params.id, user);

    if (!book) {
      throw request.server.httpErrors.notFound('Book not found');
    }

    const data = await this.books.read(book);

    if (!data) {
      throw request.server.httpErrors.notFound('File not found');
    }

    reply
      .type(book.mimeType || 'application/pdf')
      .header('cache-control', 'private, max-age=31536000, immutable')
      .header('content-disposition', `inline; filename*=UTF-8''${encodeURIComponent(book.title)}`)
      .send(data);
  };

  private async requireUser(request: FastifyRequest): Promise<User> {
    const user = await getSessionUser(request, this.auth);

    if (!user) {
      throw request.server.httpErrors.unauthorized('Not authenticated');
    }

    return user;
  }
}
