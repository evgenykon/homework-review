import { randomBytes } from 'node:crypto';
import type { User, UserType } from '../../generated/prisma/client';
import type { AppConfig } from '../config/env';
import type { OAuthAccountRepository } from '../repositories/oauth-account.repository';
import type { SessionRepository } from '../repositories/session.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { YandexOAuthService } from './yandex-oauth.service';

const YANDEX_PROVIDER = 'yandex';

export type LoginOptions = {
  type: UserType;
  parentId?: string | null;
};

export type SessionResult = {
  token: string;
  expiresAt: Date;
  user: User;
};

export class AuthService {
  constructor(
    private readonly config: AppConfig,
    private readonly users: UserRepository,
    private readonly accounts: OAuthAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly yandex: YandexOAuthService,
  ) {}

  get appUrl(): string {
    return this.config.appUrl;
  }

  get cookieSecure(): boolean {
    return this.config.cookieSecure;
  }

  buildAuthorizeUrl(state: string): string {
    return this.yandex.buildAuthorizeUrl(state);
  }

  async loginWithYandex(code: string, options: LoginOptions): Promise<SessionResult> {
    const accessToken = await this.yandex.exchangeCode(code);
    const profile = await this.yandex.fetchProfile(accessToken);

    const account = await this.accounts.findByProvider(
      YANDEX_PROVIDER,
      profile.providerAccountId,
    );

    let user: User;

    if (account) {
      const existing = await this.users.findById(account.userId);

      if (!existing) {
        throw new Error(`OAuth account ${account.id} references missing user`);
      }

      user = await this.users.update(existing.id, {
        name: profile.name,
        photoUrl: profile.photoUrl,
      });
    } else {
      user = await this.users.create({
        name: profile.name,
        type: options.type,
        photoUrl: profile.photoUrl,
        parentId: await this.resolveParentId(options),
      });

      await this.accounts.create({
        userId: user.id,
        provider: YANDEX_PROVIDER,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
      });
    }

    return this.createSession(user);
  }

  async createSession(user: User): Promise<SessionResult> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.config.sessionTtlMs);

    await this.sessions.create({ userId: user.id, token, expiresAt });

    return { token, expiresAt, user };
  }

  async getUserByToken(token: string): Promise<User | null> {
    const session = await this.sessions.findByToken(token);

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessions.deleteByToken(token);
      return null;
    }

    return this.users.findById(session.userId);
  }

  async logout(token: string): Promise<void> {
    await this.sessions.deleteByToken(token);
  }

  private async resolveParentId(options: LoginOptions): Promise<string | null> {
    if (options.type !== 'child' || !options.parentId) {
      return null;
    }

    const parent = await this.users.findById(options.parentId);

    if (!parent || parent.type !== 'parent') {
      return null;
    }

    return parent.id;
  }
}
