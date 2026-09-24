import type { ScheduleRepository } from '../repositories/schedule.repository';

export const DAY_COUNT = 7;

const EMPTY_DAYS = Array.from({ length: DAY_COUNT }, () => '');

export class ScheduleService {
  constructor(private readonly schedules: ScheduleRepository) {}

  async get(ownerId: string): Promise<{ days: string[] }> {
    const schedule = await this.schedules.findByOwner(ownerId);

    if (!schedule) {
      return { days: [...EMPTY_DAYS] };
    }

    const days = Array.isArray(schedule.days) ? (schedule.days as unknown[]) : [];

    return {
      days: Array.from({ length: DAY_COUNT }, (_, index) => {
        const value = days[index];
        return typeof value === 'string' ? value : '';
      }),
    };
  }

  async update(ownerId: string, days: string[]): Promise<{ days: string[] }> {
    const normalized = Array.from({ length: DAY_COUNT }, (_, index) => {
      const value = days[index];
      return typeof value === 'string' ? value.trim() : '';
    });

    await this.schedules.upsert(ownerId, normalized);
    return { days: normalized };
  }
}
