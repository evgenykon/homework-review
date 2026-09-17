import { randomBytes } from 'node:crypto';
import type { User, UserType } from '../../generated/prisma/client';
import type { AppConfig } from '../config/env';
import type { OAuthAccountRepository } from '../repositories/oauth-account.repository';
import type { SessionRepository } from '../repositories/session.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { InviteService } from './invite.service';
import type { YandexOAuthService, YandexProfile } from './yandex-oauth.service';

const YANDEX_PROVIDER = 'yandex';

export type LoginOptions = {
  type: UserType;
  parentId?: string | null;
  inviteToken?: string | null;
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
    private readonly invites: InviteService,
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
    return this.loginWithAccessToken(accessToken, options);
  }

  async loginWithYandexToken(accessToken: string, options: LoginOptions): Promise<SessionResult> {
    return this.loginWithAccessToken(accessToken, options);
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

  private async loginWithAccessToken(
    accessToken: string,
    options: LoginOptions,
  ): Promise<SessionResult> {
    const profile = await this.yandex.fetchProfile(accessToken);
    const user = await this.upsertUser(profile, options);
    return this.createSession(user);
  }

  private async upsertUser(profile: YandexProfile, options: LoginOptions): Promise<User> {
    const invite = options.inviteToken ? await this.invites.resolve(options.inviteToken) : null;

    const account = await this.accounts.findByProvider(
      YANDEX_PROVIDER,
      profile.providerAccountId,
    );

    if (account) {
      const existing = await this.users.findById(account.userId);

      if (!existing) {
        throw new Error(`OAuth account ${account.id} references missing user`);
      }

      const linkedParentId =
        invite && invite.parentId !== existing.id ? invite.parentId : existing.parentId;

      const user = await this.users.update(existing.id, {
        name: profile.name,
        photoUrl: profile.photoUrl ?? existing.photoUrl,
        age: profile.age ?? existing.age,
        parentId: linkedParentId,
      });

      if (invite && user.parentId === invite.parentId) {
        await this.invites.consume(invite, user.id);
      }

      return user;
    }

    const type: UserType = invite ? 'child' : options.type;
    const parentId = invite ? invite.parentId : await this.resolveParentId(options);

    const user = await this.users.create({
      name: profile.name,
      type,
      photoUrl: profile.photoUrl,
      age: profile.age,
      parentId,
    });

    await this.accounts.create({
      userId: user.id,
      provider: YANDEX_PROVIDER,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
    });

    if (invite) {
      await this.invites.consume(invite, user.id);
    }

    return user;
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
