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

    if (!Array.isArray(request.body?.days)) {
      throw request.server.httpErrors.badRequest('days is required');
    }

    reply.send(await this.schedules.update(user.id, request.body.days));
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
