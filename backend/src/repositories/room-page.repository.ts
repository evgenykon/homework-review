import type { PrismaClient, RoomPage, Stroke } from '../../generated/prisma/client';

export type RoomPageWithStrokes = RoomPage & { strokes: Stroke[] };

export type CreateRoomPageData = {
  sessionId: string;
  position: number;
  fileName: string;
  mimeType: string;
};

export class RoomPageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findBySession(sessionId: string): Promise<RoomPageWithStrokes[]> {
    return this.prisma.roomPage.findMany({
      where: { sessionId },
      orderBy: { position: 'asc' },
      include: { strokes: { orderBy: { createdAt: 'asc' } } },
    });
  }

  findById(id: string): Promise<RoomPage | null> {
    return this.prisma.roomPage.findUnique({ where: { id } });
  }

  countBySession(sessionId: string): Promise<number> {
    return this.prisma.roomPage.count({ where: { sessionId } });
  }

  create(data: CreateRoomPageData): Promise<RoomPage> {
    return this.prisma.roomPage.create({ data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.roomPage.delete({ where: { id } });
  }
}
