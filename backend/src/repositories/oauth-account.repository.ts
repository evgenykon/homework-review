import type { OAuthAccount, PrismaClient } from '../../generated/prisma/client';

export type CreateOAuthAccountData = {
  userId: string;
  provider: string;
  providerAccountId: string;
  email?: string | null;
};

export class OAuthAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByProvider(provider: string, providerAccountId: string): Promise<OAuthAccount | null> {
    return this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
    });
  }

  create(data: CreateOAuthAccountData): Promise<OAuthAccount> {
    return this.prisma.oAuthAccount.create({ data });
  }
}
