import type { Book, PrismaClient, SessionBook } from '../../generated/prisma/client';

export type SessionBookWithBook = SessionBook & { book: Book };

export class SessionBookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findBySession(sessionId: string): Promise<SessionBookWithBook[]> {
    return this.prisma.sessionBook.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: { book: true },
    });
  }

  async findSessionIdsByBook(bookId: string): Promise<string[]> {
    const links = await this.prisma.sessionBook.findMany({
      where: { bookId },
      select: { sessionId: true },
    });

    return links.map((link) => link.sessionId);
  }

  async sync(sessionId: string, bookIds: string[]): Promise<void> {
    await this.prisma.sessionBook.deleteMany({
      where: { sessionId, bookId: { notIn: bookIds } },
    });

    if (bookIds.length > 0) {
      await this.prisma.sessionBook.createMany({
        data: bookIds.map((bookId) => ({ sessionId, bookId })),
        skipDuplicates: true,
      });
    }
  }
}
