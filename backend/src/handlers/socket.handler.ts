import type { RawData, WebSocket } from 'ws';
import type { MessageService } from '../services/message.service';
import type { RealtimeService } from '../services/realtime.service';

export class SocketHandler {
  constructor(
    private readonly messages: MessageService,
    private readonly realtime: RealtimeService,
  ) {}

  handleConnection = (socket: WebSocket): void => {
    this.realtime.add(socket);
    this.realtime.send(socket, { type: 'welcome', message: 'websocket connected' });

    socket.on('message', (raw: RawData) => {
      void this.handleMessage(socket, raw);
    });

    socket.on('close', () => {
      this.realtime.remove(socket);
    });
  };

  private async handleMessage(socket: WebSocket, raw: RawData): Promise<void> {
    const body = this.parseBody(raw);

    if (!body) {
      return;
    }

    try {
      await this.messages.create(body);
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
