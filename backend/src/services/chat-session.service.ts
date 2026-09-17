import type { ChatSession, ReviewStatus, User } from '../../generated/prisma/client';
import type { ChatSessionRepository } from '../repositories/chat-session.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { ChatService } from './chat.service';
import type { RealtimeService } from './realtime.service';

const REVIEW_RESULT_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'Ожидает',
  REVIEWED: 'Есть замечания',
  APPROVED: 'Одобрено',
};

export class ChatSessionService {
  constructor(
    private readonly sessions: ChatSessionRepository,
    private readonly users: UserRepository,
    private readonly chat: ChatService,
    private readonly realtime: RealtimeService,
  ) {}

  async createForChild(
    parentId: string,
    childId: string,
    name: string,
  ): Promise<ChatSession | null> {
    const child = await this.users.findChild(parentId, childId);

    if (!child) {
      return null;
    }

    return this.sessions.create({ name, childId, parentId });
  }

  async listForChild(parentId: string, childId: string): Promise<ChatSession[]> {
    const child = await this.users.findChild(parentId, childId);

    if (!child) {
      return [];
    }

    return this.sessions.findByChild(childId);
  }

  listForUser(user: User): Promise<ChatSession[]> {
    return user.type === 'child'
      ? this.sessions.findByChild(user.id)
      : this.sessions.findByParent(user.id);
  }

  async findAccessible(sessionId: string, user: User): Promise<ChatSession | null> {
    const session = await this.sessions.findById(sessionId);

    if (!session) {
      return null;
    }

    if (session.parentId === user.id || session.childId === user.id) {
      return session;
    }

    return null;
  }

  async setStatus(sessionId: string, status: ReviewStatus): Promise<ChatSession> {
    const session = await this.sessions.updateStatus(sessionId, status);
    this.realtime.broadcastToSession(sessionId, { type: 'session:update', session });
    return session;
  }

  async review(session: ChatSession, user: User, result: ReviewStatus): Promise<ChatSession> {
    const updated = await this.setStatus(session.id, result);

    await this.chat.createMessage(
      session.id,
      user.id,
      `${user.name} закончил ревью, результат: ${REVIEW_RESULT_LABELS[result]}`,
      true,
    );

    return updated;
  }
}
