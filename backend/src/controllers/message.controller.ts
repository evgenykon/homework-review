import type { FastifyReply, FastifyRequest } from 'fastify';
import type { MessageService } from '../services/message.service';

type CreateMessageBody = {
  body?: string;
};

export class MessageController {
  constructor(private readonly service: MessageService) {}

  list = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(await this.service.list());
  };

  create = async (
    request: FastifyRequest<{ Body: CreateMessageBody }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const body = request.body?.body?.trim();

    if (!body) {
      throw request.server.httpErrors.badRequest('body is required');
    }

    reply.code(201).send(await this.service.create(body));
  };
}
