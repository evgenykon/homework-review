import type { ChatSession } from '../../generated/prisma/client';
import type { RealtimeService } from './realtime.service';

export type NotificationKind = 'message' | 'status' | 'image';

export function sendNotification(
  realtime: RealtimeService,
  session: ChatSession,
  actorId: string,
  kind: NotificationKind,
  body: string,
): void {
  const counterpartId = session.parentId === actorId ? session.childId : session.parentId;

  realtime.broadcastToUser(counterpartId, {
    type: 'notification',
    kind,
    sessionId: session.id,
    title: session.name,
    body,
  });
}
