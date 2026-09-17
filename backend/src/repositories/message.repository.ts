import type { Message, PrismaClient } from '../../generated/prisma/client';

export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(limit = 100): Promise<Message[]> {
    return this.prisma.message.findMany({
      orderBy: { id: 'desc' },
      take: limit,
    });
  }

  create(body: string): Promise<Message> {
    return this.prisma.message.create({
      data: { body },
    });
  }
}
