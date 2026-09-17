import type { PrismaClient, SessionRead } from '../../generated/prisma/client';

export class SessionReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByUser(userId: string): Promise<SessionRead[]> {
    return this.prisma.sessionRead.findMany({ where: { userId } });
  }

  findByUserAndSession(userId: string, sessionId: string): Promise<SessionRead | null> {
    return this.prisma.sessionRead.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
    });
  }

  upsert(userId: string, sessionId: string, lastReadMessageId: number): Promise<SessionRead> {
    return this.prisma.sessionRead.upsert({
      where: { userId_sessionId: { userId, sessionId } },
      create: { userId, sessionId, lastReadMessageId },
      update: { lastReadMessageId },
    });
  }
}
