import type { Book, PrismaClient } from '../../generated/prisma/client';

export type CreateBookData = {
  ownerId: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export class BookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByOwner(ownerId: string): Promise<Book[]> {
    return this.prisma.book.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<Book | null> {
    return this.prisma.book.findUnique({ where: { id } });
  }

  create(data: CreateBookData): Promise<Book> {
    return this.prisma.book.create({ data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.book.delete({ where: { id } });
  }
}
