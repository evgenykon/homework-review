import type { Message } from '../../generated/prisma/client';
import type { MessageRepository } from '../repositories/message.repository';
import type { RealtimeService } from './realtime.service';

export class MessageService {
  constructor(
    private readonly repository: MessageRepository,
    private readonly realtime: RealtimeService,
  ) {}

  list(): Promise<Message[]> {
    return this.repository.findMany();
  }

  async create(body: string): Promise<Message> {
    const message = await this.repository.create(body);
    this.realtime.broadcast({ type: 'message', message });
    return message;
  }
}
