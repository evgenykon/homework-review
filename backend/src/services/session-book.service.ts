import type { Book, User } from '../../generated/prisma/client';
import type { BookRepository } from '../repositories/book.repository';
import type { SessionBookRepository } from '../repositories/session-book.repository';
import type { RealtimeService } from './realtime.service';
import { libraryOwnerId } from './book.service';

export class SessionBookService {
  constructor(
    private readonly links: SessionBookRepository,
    private readonly books: BookRepository,
    private readonly realtime: RealtimeService,
  ) {}

  async list(sessionId: string): Promise<Book[]> {
    const links = await this.links.findBySession(sessionId);
    return links.map((link) => link.book);
  }

  async sync(sessionId: string, user: User, bookIds: string[]): Promise<Book[]> {
    const library = await this.books.findByOwner(libraryOwnerId(user));
    const allowed = new Set(library.map((book) => book.id));
    const filtered = [...new Set(bookIds)].filter((bookId) => allowed.has(bookId));

    await this.links.sync(sessionId, filtered);
    this.realtime.broadcastToSession(sessionId, { type: 'session:books:changed', sessionId });

    return this.list(sessionId);
  }
}
