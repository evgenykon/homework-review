import type { FastifyReply, FastifyRequest } from 'fastify';
import type { HealthService } from '../services/health.service';

export class HealthController {
  constructor(private readonly service: HealthService) {}

  check = async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.send(await this.service.check());
  };
}
