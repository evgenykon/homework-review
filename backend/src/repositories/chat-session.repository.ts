import type { ChatSession, PrismaClient, ReviewStatus } from '../../generated/prisma/client';

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
      where: { childId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByParent(parentId: string): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: { parentId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findArchivedByParent(parentId: string): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: { parentId, archivedAt: { not: null } },
      orderBy: { archivedAt: 'desc' },
    });
  }

  updateStatus(id: string, status: ReviewStatus): Promise<ChatSession> {
    return this.prisma.chatSession.update({
      where: { id },
      data: { status },
    });
  }

  archive(id: string): Promise<ChatSession> {
    return this.prisma.chatSession.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  restore(id: string): Promise<ChatSession> {
    return this.prisma.chatSession.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.chatSession.delete({ where: { id } });
  }
}
