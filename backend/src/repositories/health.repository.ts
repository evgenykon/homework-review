import type { PrismaClient } from '../../generated/prisma/client';

export class HealthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async ping(): Promise<Date> {
    const rows = await this.prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`;
    return rows[0].now;
  }
}
