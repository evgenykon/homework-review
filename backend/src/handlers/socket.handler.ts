import type { FastifyRequest } from 'fastify';
import type { RawData, WebSocket } from 'ws';
import { SESSION_COOKIE } from '../config/cookies';
import type { AuthService } from '../services/auth.service';
import type { ChatService } from '../services/chat.service';
import type { ChatSessionService } from '../services/chat-session.service';
import type { RealtimeService } from '../services/realtime.service';

type WsQuery = {
  sessionId?: string;
};

export class SocketHandler {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: ChatSessionService,
    private readonly chat: ChatService,
    private readonly realtime: RealtimeService,
  ) {}

  handleConnection = async (socket: WebSocket, request: FastifyRequest): Promise<void> => {
    const { sessionId } = request.query as WsQuery;

    if (!sessionId) {
      this.realtime.send(socket, { type: 'error', message: 'sessionId is required' });
      socket.close();
      return;
    }

    const token = request.cookies[SESSION_COOKIE];
    const user = token ? await this.auth.getUserByToken(token) : null;

    if (!user) {
      this.realtime.send(socket, { type: 'error', message: 'unauthorized' });
      socket.close();
      return;
    }

    const session = await this.sessions.findAccessible(sessionId, user);

    if (!session) {
      this.realtime.send(socket, { type: 'error', message: 'session not found' });
      socket.close();
      return;
    }

    this.realtime.join(sessionId, socket);
    this.realtime.send(socket, { type: 'ready', sessionId });

    socket.on('message', (raw: RawData) => {
      void this.handleMessage(socket, sessionId, user.id, raw);
    });

    socket.on('close', () => {
      this.realtime.leave(sessionId, socket);
    });
  };

  private async handleMessage(
    socket: WebSocket,
    sessionId: string,
    senderId: string,
    raw: RawData,
  ): Promise<void> {
    const body = this.parseBody(raw);

    if (!body) {
      return;
    }

    try {
      await this.chat.createMessage(sessionId, senderId, body);
    } catch {
      this.realtime.send(socket, { type: 'error', message: 'failed to store message' });
    }
  }

  private parseBody(raw: RawData): string {
    const text = raw.toString().trim();

    try {
      const parsed = JSON.parse(text) as { body?: string };
      return parsed.body?.trim() ?? '';
    } catch {
      return text;
    }
  }
}
