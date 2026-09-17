import type { ChatSession, User } from '../../generated/prisma/client';
import type { ChatSessionRepository } from '../repositories/chat-session.repository';
import type { UserRepository } from '../repositories/user.repository';

export class ChatSessionService {
  constructor(
    private readonly sessions: ChatSessionRepository,
    private readonly users: UserRepository,
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
}
