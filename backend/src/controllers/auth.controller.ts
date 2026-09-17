import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserType } from '../../generated/prisma/client';
import type { AuthService } from '../services/auth.service';

const SESSION_COOKIE = 'sid';
const STATE_COOKIE = 'oauth_state';
const STATE_MAX_AGE_SECONDS = 10 * 60;

type StartQuery = {
  role?: string;
  parentId?: string;
};

type CallbackQuery = {
  code?: string;
  state?: string;
};

type StatePayload = {
  nonce: string;
  type: UserType;
  parentId: string | null;
};

export class AuthController {
  constructor(private readonly service: AuthService) {}

  startYandex = async (
    request: FastifyRequest<{ Querystring: StartQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const type = request.query.role === 'child' ? UserType.child : UserType.parent;

    const state = Buffer.from(
      JSON.stringify({
        nonce: randomBytes(16).toString('hex'),
        type,
        parentId: request.query.parentId ?? null,
      } satisfies StatePayload),
    ).toString('base64url');

    reply.setCookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.service.cookieSecure,
      path: '/',
      maxAge: STATE_MAX_AGE_SECONDS,
    });

    reply.redirect(this.service.buildAuthorizeUrl(state));
  };

  callbackYandex = async (
    request: FastifyRequest<{ Querystring: CallbackQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { code, state } = request.query;
    const cookieState = request.cookies[STATE_COOKIE];

    if (!code || !state || !cookieState || state !== cookieState) {
      throw request.server.httpErrors.badRequest('Invalid OAuth state');
    }

    const payload = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf8'),
    ) as StatePayload;

    let token: string;
    let expiresAt: Date;

    try {
      const result = await this.service.loginWithYandex(code, {
        type: payload.type,
        parentId: payload.parentId,
      });
      token = result.token;
      expiresAt = result.expiresAt;
    } catch (error) {
      request.log.error(error, 'Yandex OAuth login failed');
      throw request.server.httpErrors.badGateway('Yandex OAuth login failed');
    }

    reply.clearCookie(STATE_COOKIE, { path: '/' });
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.service.cookieSecure,
      path: '/',
      expires: expiresAt,
    });

    reply.redirect(this.service.appUrl);
  };

  me = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const token = request.cookies[SESSION_COOKIE];
    const user = token ? await this.service.getUserByToken(token) : null;

    if (!user) {
      throw request.server.httpErrors.unauthorized('Not authenticated');
    }

    reply.send(user);
  };

  logout = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const token = request.cookies[SESSION_COOKIE];

    if (token) {
      await this.service.logout(token);
    }

    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    reply.send({ ok: true });
  };
}
