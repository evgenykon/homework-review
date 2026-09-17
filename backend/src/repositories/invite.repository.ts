import type { Invite, PrismaClient } from '../../generated/prisma/client';

export type CreateInviteData = {
  token: string;
  parentId: string;
  expiresAt: Date;
};

export class InviteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: CreateInviteData): Promise<Invite> {
    return this.prisma.invite.create({ data });
  }

  findByToken(token: string): Promise<Invite | null> {
    return this.prisma.invite.findUnique({ where: { token } });
  }

  markUsed(id: string, usedById: string, usedAt: Date): Promise<Invite> {
    return this.prisma.invite.update({
      where: { id },
      data: { usedAt, usedById },
    });
  }
}
