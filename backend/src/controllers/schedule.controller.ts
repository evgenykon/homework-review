import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../../generated/prisma/client';
import type { AuthService } from '../services/auth.service';
import type { ScheduleService } from '../services/schedule.service';
import { getSessionUser } from './session';

export class ScheduleController {
  constructor(
    private readonly schedules: ScheduleService,
    private readonly auth: AuthService,
  ) {}

  get = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await this.requireUser(request);
    reply.send(await this.schedules.get(user.id));
  };

  update = async (
    request: FastifyRequest<{ Body: { days?: unknown } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.requireParent(request);
    const raw = Array.isArray(request.body?.days) ? request.body.days : [];
    const days = raw.filter((item): item is string => typeof item === 'string');

    if (days.length !== 7) {
      throw request.server.httpErrors.badRequest('days must have 7 entries');
    }

    reply.send(await this.schedules.update(user.id, days));
  };

  private async requireUser(request: FastifyRequest): Promise<User> {
    const user = await getSessionUser(request, this.auth);

    if (!user) {
      throw request.server.httpErrors.unauthorized('Not authenticated');
    }

    return user;
  }

  private async requireParent(request: FastifyRequest): Promise<User> {
    const user = await this.requireUser(request);

    if (user.type !== 'parent') {
      throw request.server.httpErrors.forbidden('Parent only');
    }

    return user;
  }
}
