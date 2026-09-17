import type { Message, PrismaClient } from '../../generated/prisma/client';

export type CreateMessageData = {
  sessionId: string;
  senderId: string;
  body: string;
  system?: boolean;
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

  countUnread(sessionId: string, lastReadMessageId: number, senderId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        sessionId,
        id: { gt: lastReadMessageId },
        senderId: { not: senderId },
      },
    });
  }

  async maxId(sessionId: string): Promise<number> {
    const last = await this.prisma.message.findFirst({
      where: { sessionId },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    return last?.id ?? 0;
  }
}
