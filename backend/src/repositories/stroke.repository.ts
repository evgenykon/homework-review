import type { Prisma, PrismaClient, Stroke } from '../../generated/prisma/client';

export class StrokeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(pageId: string, data: Prisma.InputJsonValue): Promise<Stroke> {
    return this.prisma.stroke.create({
      data: { pageId, data },
    });
  }

  findById(id: string): Promise<Stroke | null> {
    return this.prisma.stroke.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.stroke.delete({ where: { id } });
  }
}
