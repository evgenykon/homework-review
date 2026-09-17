import type { FastifyRequest } from 'fastify';
import type { User } from '../../generated/prisma/client';
import { SESSION_COOKIE } from '../config/cookies';
import type { AuthService } from '../services/auth.service';

export async function getSessionUser(
  request: FastifyRequest,
  auth: AuthService,
): Promise<User | null> {
  const token = request.cookies[SESSION_COOKIE];
  return token ? auth.getUserByToken(token) : null;
}
