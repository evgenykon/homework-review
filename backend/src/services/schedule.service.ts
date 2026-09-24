import type { Prisma } from '../../generated/prisma/client';
import type { ScheduleRepository } from '../repositories/schedule.repository';

export const DAY_COUNT = 7;
export const LESSONS_PER_DAY = 7;

function normalizeDays(raw: unknown): string[][] {
  const days = Array.isArray(raw) ? (raw as unknown[]) : [];

  return Array.from({ length: DAY_COUNT }, (_, dayIndex) => {
    const day = Array.isArray(days[dayIndex]) ? (days[dayIndex] as unknown[]) : [];

    return Array.from({ length: LESSONS_PER_DAY }, (_, lessonIndex) => {
      const value = day[lessonIndex];
      return typeof value === 'string' ? value.trim() : '';
    });
  });
}

export class ScheduleService {
  constructor(private readonly schedules: ScheduleRepository) {}

  async get(ownerId: string): Promise<{ days: string[][] }> {
    const schedule = await this.schedules.findByOwner(ownerId);

    if (!schedule) {
      return { days: normalizeDays([]) };
    }

    return { days: normalizeDays(schedule.days) };
  }

  async update(ownerId: string, raw: unknown): Promise<{ days: string[][] }> {
    const days = normalizeDays(raw);
    await this.schedules.upsert(ownerId, days as Prisma.InputJsonValue);
    return { days };
  }
}
