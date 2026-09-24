import type { PrismaClient, Schedule } from '../../generated/prisma/client';

export class ScheduleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByOwner(ownerId: string): Promise<Schedule | null> {
    return this.prisma.schedule.findUnique({ where: { ownerId } });
  }

  upsert(ownerId: string, days: string[]): Promise<Schedule> {
    return this.prisma.schedule.upsert({
      where: { ownerId },
      create: { ownerId, days },
      update: { days },
    });
  }
}
