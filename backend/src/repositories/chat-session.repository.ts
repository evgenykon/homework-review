import type { ChatSession, PrismaClient } from '../../generated/prisma/client';

export type CreateChatSessionData = {
  name: string;
  childId: string;
  parentId: string;
};

export class ChatSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: CreateChatSessionData): Promise<ChatSession> {
    return this.prisma.chatSession.create({ data });
  }

  findById(id: string): Promise<ChatSession | null> {
    return this.prisma.chatSession.findUnique({ where: { id } });
  }

  findByChild(childId: string): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByParent(parentId: string): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
