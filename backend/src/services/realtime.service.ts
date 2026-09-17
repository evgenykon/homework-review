import type { WebSocket } from 'ws';

export type RealtimeEvent = {
  type: string;
  [key: string]: unknown;
};

export class RealtimeService {
  private readonly clients = new Set<WebSocket>();

  add(client: WebSocket): void {
    this.clients.add(client);
  }

  remove(client: WebSocket): void {
    this.clients.delete(client);
  }

  send(client: WebSocket, event: RealtimeEvent): void {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(event));
    }
  }

  broadcast(event: RealtimeEvent): void {
    const payload = JSON.stringify(event);

    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      } else {
        this.clients.delete(client);
      }
    }
  }
}
