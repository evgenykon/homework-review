import type { WebSocket } from 'ws';

export type RealtimeEvent = {
  type: string;
  [key: string]: unknown;
};

export class RealtimeService {
  private readonly rooms = new Map<string, Set<WebSocket>>();
  private readonly users = new Map<string, Set<WebSocket>>();

  join(sessionId: string, client: WebSocket): void {
    this.add(this.rooms, sessionId, client);
  }

  leave(sessionId: string, client: WebSocket): void {
    this.remove(this.rooms, sessionId, client);
  }

  joinUser(userId: string, client: WebSocket): void {
    this.add(this.users, userId, client);
  }

  leaveUser(userId: string, client: WebSocket): void {
    this.remove(this.users, userId, client);
  }

  send(client: WebSocket, event: RealtimeEvent): void {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(event));
    }
  }

  broadcastToSession(sessionId: string, event: RealtimeEvent): void {
    this.broadcast(this.rooms, sessionId, event);
  }

  broadcastToUser(userId: string, event: RealtimeEvent): void {
    this.broadcast(this.users, userId, event);
  }

  private add(map: Map<string, Set<WebSocket>>, key: string, client: WebSocket): void {
    let set = map.get(key);

    if (!set) {
      set = new Set();
      map.set(key, set);
    }

    set.add(client);
  }

  private remove(map: Map<string, Set<WebSocket>>, key: string, client: WebSocket): void {
    const set = map.get(key);

    if (!set) {
      return;
    }

    set.delete(client);

    if (set.size === 0) {
      map.delete(key);
    }
  }

  private broadcast(map: Map<string, Set<WebSocket>>, key: string, event: RealtimeEvent): void {
    const set = map.get(key);

    if (!set) {
      return;
    }

    const payload = JSON.stringify(event);

    for (const client of set) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      } else {
        set.delete(client);
      }
    }
  }
}
