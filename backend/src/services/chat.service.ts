import type { Message } from '../../generated/prisma/client';
import type { ChatSessionRepository } from '../repositories/chat-session.repository';
import type { MessageRepository } from '../repositories/message.repository';
import type { SessionReadRepository } from '../repositories/session-read.repository';
import type { RealtimeService } from './realtime.service';

export class ChatService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly sessions: ChatSessionRepository,
    private readonly reads: SessionReadRepository,
    private readonly realtime: RealtimeService,
  ) {}

  listMessages(sessionId: string): Promise<Message[]> {
    return this.messages.findBySession(sessionId);
  }

  async createMessage(
    sessionId: string,
    senderId: string,
    body: string,
    system = false,
  ): Promise<Message> {
    const message = await this.messages.create({ sessionId, senderId, body, system });
    this.realtime.broadcastToSession(sessionId, { type: 'message', message });

    const session = await this.sessions.findById(sessionId);

    if (session) {
      this.realtime.broadcastToUser(session.parentId, { type: 'sessions:changed' });
      this.realtime.broadcastToUser(session.childId, { type: 'sessions:changed' });
    }

    return message;
  }

  async unreadCount(userId: string, sessionId: string): Promise<number> {
    const read = await this.reads.findByUserAndSession(userId, sessionId);

    return this.messages.countUnread(sessionId, read?.lastReadMessageId ?? 0, userId);
  }

  async markRead(userId: string, sessionId: string): Promise<void> {
    const lastReadMessageId = await this.messages.maxId(sessionId);
    await this.reads.upsert(userId, sessionId, lastReadMessageId);
  }
}
