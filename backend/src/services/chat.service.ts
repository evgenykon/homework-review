import type { Message } from '../../generated/prisma/client';
import type { MessageRepository } from '../repositories/message.repository';
import type { RealtimeService } from './realtime.service';

export class ChatService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly realtime: RealtimeService,
  ) {}

  listMessages(sessionId: string): Promise<Message[]> {
    return this.messages.findBySession(sessionId);
  }

  async createMessage(sessionId: string, senderId: string, body: string): Promise<Message> {
    const message = await this.messages.create({ sessionId, senderId, body });
    this.realtime.broadcastToSession(sessionId, { type: 'message', message });
    return message;
  }
}
