import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Book, User } from '../../generated/prisma/client';
import type { BookRepository } from '../repositories/book.repository';
import type { SessionBookRepository } from '../repositories/session-book.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { RealtimeService } from './realtime.service';
import type { StorageService } from './storage.service';

export type UploadedBook = {
  title: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
};

export function libraryOwnerId(user: User): string {
  return user.type === 'parent' ? user.id : (user.parentId ?? user.id);
}

export class BookService {
  constructor(
    private readonly storage: StorageService,
    private readonly books: BookRepository,
    private readonly sessionBooks: SessionBookRepository,
    private readonly users: UserRepository,
    private readonly realtime: RealtimeService,
  ) {}

  list(user: User): Promise<Book[]> {
    return this.books.findByOwner(libraryOwnerId(user));
  }

  async create(user: User, book: UploadedBook): Promise<Book> {
    const extension = extname(book.fileName).toLowerCase() || '.pdf';
    const fileName = `${randomUUID()}${extension}`;
    await this.storage.save(fileName, book.data);

    const created = await this.books.create({
      ownerId: libraryOwnerId(user),
      title: book.title,
      fileName,
      mimeType: book.mimeType,
      size: book.data.length,
    });

    await this.notifyChanged(created.ownerId);

    return created;
  }

  async remove(book: Book): Promise<void> {
    const sessionIds = await this.sessionBooks.findSessionIdsByBook(book.id);

    await this.books.delete(book.id);
    await this.storage.remove(book.fileName);

    for (const sessionId of sessionIds) {
      this.realtime.broadcastToSession(sessionId, { type: 'session:books:changed', sessionId });
    }

    await this.notifyChanged(book.ownerId);
  }

  async findAccessible(bookId: string, user: User): Promise<Book | null> {
    const book = await this.books.findById(bookId);

    if (!book || book.ownerId !== libraryOwnerId(user)) {
      return null;
    }

    return book;
  }

  read(book: Book): Promise<Buffer | null> {
    return this.storage.read(book.fileName);
  }

  private async notifyChanged(ownerId: string): Promise<void> {
    this.realtime.broadcastToUser(ownerId, { type: 'library:changed' });

    const children = await this.users.findChildren(ownerId);

    for (const child of children) {
      this.realtime.broadcastToUser(child.id, { type: 'library:changed' });
    }
  }
}
