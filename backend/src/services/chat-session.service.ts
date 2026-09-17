import type { ChatSession, ReviewStatus, User } from '../../generated/prisma/client';
import type { ChatSessionRepository } from '../repositories/chat-session.repository';
import type { RoomPageRepository } from '../repositories/room-page.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { ChatService } from './chat.service';
import { sendNotification, type NotificationKind } from './notifications';
import type { RealtimeService } from './realtime.service';
import type { StorageService } from './storage.service';

const REVIEW_RESULT_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'Ожидает',
  REVIEWED: 'Есть замечания',
  APPROVED: 'Одобрено',
};

export type ChatSessionWithUnread = ChatSession & { unreadCount: number };

export class ChatSessionService {
  constructor(
    private readonly sessions: ChatSessionRepository,
    private readonly users: UserRepository,
    private readonly pages: RoomPageRepository,
    private readonly storage: StorageService,
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

    const session = await this.sessions.create({ name, childId, parentId });
    this.notifyChanged(session);

    return session;
  }

  async listForChild(parentId: string, childId: string): Promise<ChatSession[]> {
    const child = await this.users.findChild(parentId, childId);

    if (!child) {
      return [];
    }

    return this.sessions.findByChild(childId);
  }

  async listForUser(user: User): Promise<ChatSessionWithUnread[]> {
    const sessions =
      user.type === 'child'
        ? await this.sessions.findByChild(user.id)
        : await this.sessions.findByParent(user.id);

    return Promise.all(
      sessions.map(async (session) => ({
        ...session,
        unreadCount: await this.chat.unreadCount(user.id, session.id),
      })),
    );
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
    this.notifyChanged(session);
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

    sendNotification(
      this.realtime,
      updated,
      user.id,
      'status',
      `Ревью: ${REVIEW_RESULT_LABELS[result]}`,
    );

    return updated;
  }

  async notify(sessionId: string, actorId: string, kind: NotificationKind, body: string): Promise<void> {
    const session = await this.sessions.findById(sessionId);

    if (session) {
      sendNotification(this.realtime, session, actorId, kind, body);
    }
  }

  listArchivedForParent(parentId: string): Promise<ChatSession[]> {
    return this.sessions.findArchivedByParent(parentId);
  }

  async archive(session: ChatSession): Promise<ChatSession> {
    const updated = await this.sessions.archive(session.id);
    this.realtime.broadcastToSession(session.id, { type: 'session:update', session: updated });
    this.notifyChanged(updated);
    return updated;
  }

  async restore(session: ChatSession): Promise<ChatSession> {
    const updated = await this.sessions.restore(session.id);
    this.realtime.broadcastToSession(session.id, { type: 'session:update', session: updated });
    this.notifyChanged(updated);
    return updated;
  }

  async remove(session: ChatSession): Promise<void> {
    const pages = await this.pages.findBySession(session.id);

    for (const page of pages) {
      await this.storage.remove(page.fileName);
    }

    await this.sessions.delete(session.id);
    this.realtime.broadcastToSession(session.id, { type: 'session:deleted', sessionId: session.id });
    this.notifyChanged(session);
  }

  private notifyChanged(session: ChatSession): void {
    this.realtime.broadcastToUser(session.parentId, { type: 'sessions:changed' });
    this.realtime.broadcastToUser(session.childId, { type: 'sessions:changed' });
  }
}
