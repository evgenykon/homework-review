import type { Message, PrismaClient } from '../../generated/prisma/client';

export type CreateMessageData = {
  sessionId: string;
  senderId: string;
  body: string;
};

export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findBySession(sessionId: string, limit = 200): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { id: 'asc' },
      take: limit,
    });
  }

  create(data: CreateMessageData): Promise<Message> {
    return this.prisma.message.create({ data });
  }
}
