import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthService } from '../services/auth.service';
import type { InviteService } from '../services/invite.service';
import { getSessionUser } from './session';

export class InviteController {
  constructor(
    private readonly invites: InviteService,
    private readonly auth: AuthService,
  ) {}

  create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await getSessionUser(request, this.auth);

    if (!user) {
      throw request.server.httpErrors.unauthorized('Not authenticated');
    }

    if (user.type !== 'parent') {
      throw request.server.httpErrors.forbidden('Only parents can invite children');
    }

    const invite = await this.invites.createForParent(user.id);

    reply.code(201).send(invite);
  };
}
