import { randomBytes } from 'node:crypto';
import type { Invite } from '../../generated/prisma/client';
import type { AppConfig } from '../config/env';
import type { InviteRepository } from '../repositories/invite.repository';

export type InviteLink = {
  token: string;
  url: string;
  expiresAt: Date;
};

export class InviteService {
  constructor(
    private readonly config: AppConfig,
    private readonly invites: InviteRepository,
  ) {}

  async createForParent(parentId: string): Promise<InviteLink> {
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.inviteTtlMs);

    await this.invites.create({ token, parentId, expiresAt });

    return {
      token,
      url: `${this.config.appUrl}/login?invite=${token}`,
      expiresAt,
    };
  }

  async resolve(token: string): Promise<Invite | null> {
    const invite = await this.invites.findByToken(token);

    if (!invite || invite.usedAt || invite.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return invite;
  }

  async consume(invite: Invite, usedById: string): Promise<void> {
    await this.invites.markUsed(invite.id, usedById, new Date());
  }
}
