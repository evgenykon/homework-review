import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../../generated/prisma/client';
import type { AuthService } from '../services/auth.service';
import type { ChildService } from '../services/child.service';
import { getSessionUser } from './session';

export class ChildController {
  constructor(
    private readonly children: ChildService,
    private readonly auth: AuthService,
  ) {}

  list = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const parent = await this.requireParent(request);
    reply.send(await this.children.listForParent(parent.id));
  };

  get = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const parent = await this.requireParent(request);
    const child = await this.children.findForParent(parent.id, request.params.id);

    if (!child) {
      throw request.server.httpErrors.notFound('Child not found');
    }

    reply.send(child);
  };

  private async requireParent(request: FastifyRequest): Promise<User> {
    const user = await getSessionUser(request, this.auth);

    if (!user) {
      throw request.server.httpErrors.unauthorized('Not authenticated');
    }

    if (user.type !== 'parent') {
      throw request.server.httpErrors.forbidden('Only parents allowed');
    }

    return user;
  }
}
