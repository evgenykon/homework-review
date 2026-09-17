import type { WebSocket } from 'ws';

export type RealtimeEvent = {
  type: string;
  [key: string]: unknown;
};

export class RealtimeService {
  private readonly rooms = new Map<string, Set<WebSocket>>();

  join(sessionId: string, client: WebSocket): void {
    let room = this.rooms.get(sessionId);

    if (!room) {
      room = new Set();
      this.rooms.set(sessionId, room);
    }

    room.add(client);
  }

  leave(sessionId: string, client: WebSocket): void {
    const room = this.rooms.get(sessionId);

    if (!room) {
      return;
    }

    room.delete(client);

    if (room.size === 0) {
      this.rooms.delete(sessionId);
    }
  }

  send(client: WebSocket, event: RealtimeEvent): void {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(event));
    }
  }

  broadcastToSession(sessionId: string, event: RealtimeEvent): void {
    const room = this.rooms.get(sessionId);

    if (!room) {
      return;
    }

    const payload = JSON.stringify(event);

    for (const client of room) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      } else {
        room.delete(client);
      }
    }
  }
}
