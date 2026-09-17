import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Prisma, RoomPage, Stroke, User } from '../../generated/prisma/client';
import type { RoomPageRepository, RoomPageWithStrokes } from '../repositories/room-page.repository';
import type { StrokeRepository } from '../repositories/stroke.repository';
import type { ChatService } from './chat.service';
import type { ChatSessionService } from './chat-session.service';
import type { RealtimeService } from './realtime.service';
import type { StorageService } from './storage.service';

export type UploadedImage = {
  fileName: string;
  mimeType: string;
  data: Buffer;
};

function extensionFor(fileName: string, mimeType: string): string {
  const fromName = extname(fileName).toLowerCase();

  if (fromName) {
    return fromName;
  }

  if (mimeType === 'image/png') {
    return '.png';
  }

  if (mimeType === 'image/webp') {
    return '.webp';
  }

  if (mimeType === 'image/gif') {
    return '.gif';
  }

  return '.jpg';
}

export class PageService {
  constructor(
    private readonly storage: StorageService,
    private readonly pages: RoomPageRepository,
    private readonly strokes: StrokeRepository,
    private readonly sessions: ChatSessionService,
    private readonly chat: ChatService,
    private readonly realtime: RealtimeService,
  ) {}

  list(sessionId: string): Promise<RoomPageWithStrokes[]> {
    return this.pages.findBySession(sessionId);
  }

  async create(sessionId: string, user: User, image: UploadedImage): Promise<RoomPage> {
    const fileName = `${randomUUID()}${extensionFor(image.fileName, image.mimeType)}`;
    await this.storage.save(fileName, image.data);

    const position = await this.pages.countBySession(sessionId);
    const page = await this.pages.create({
      sessionId,
      position,
      fileName,
      mimeType: image.mimeType,
    });

    this.realtime.broadcastToSession(sessionId, { type: 'page:add', page });

    if (user.type === 'child') {
      await this.sessions.setStatus(sessionId, 'PENDING');
    }

    await this.chat.createMessage(sessionId, user.id, `${user.name} добавил изображение`, true);
    await this.sessions.notify(sessionId, user.id, 'image', 'Добавлено изображение');

    return page;
  }

  async remove(page: RoomPage): Promise<void> {
    await this.pages.delete(page.id);
    await this.storage.remove(page.fileName);
    this.realtime.broadcastToSession(page.sessionId, { type: 'page:remove', pageId: page.id });
  }

  async addStroke(page: RoomPage, data: Prisma.InputJsonValue): Promise<Stroke> {
    const stroke = await this.strokes.create(page.id, data);
    this.realtime.broadcastToSession(page.sessionId, { type: 'stroke:add', stroke });
    return stroke;
  }

  async removeStroke(strokeId: string, user: User): Promise<boolean> {
    const stroke = await this.strokes.findById(strokeId);

    if (!stroke) {
      return false;
    }

    const page = await this.findAccessiblePage(stroke.pageId, user);

    if (!page) {
      return false;
    }

    await this.strokes.delete(stroke.id);
    this.realtime.broadcastToSession(page.sessionId, { type: 'stroke:remove', strokeId: stroke.id });

    return true;
  }

  async findAccessiblePage(pageId: string, user: User): Promise<RoomPage | null> {
    const page = await this.pages.findById(pageId);

    if (!page) {
      return null;
    }

    const session = await this.sessions.findAccessible(page.sessionId, user);

    return session ? page : null;
  }

  readImage(page: RoomPage): Promise<Buffer | null> {
    return this.storage.read(page.fileName);
  }
}
