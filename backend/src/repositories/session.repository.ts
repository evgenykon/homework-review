import type { PrismaClient, Session } from '../../generated/prisma/client';

export type CreateSessionData = {
  userId: string;
  token: string;
  expiresAt: Date;
};

export class SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: CreateSessionData): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  findByToken(token: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { token } });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { token } });
  }

  async deleteExpired(now: Date = new Date()): Promise<void> {
    await this.prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  }
}
