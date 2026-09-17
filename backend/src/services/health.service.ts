import type { HealthRepository } from '../repositories/health.repository';

export type HealthStatus = {
  status: 'ok';
  database: 'up';
  now: Date;
};

export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  async check(): Promise<HealthStatus> {
    const now = await this.repository.ping();
    return { status: 'ok', database: 'up', now };
  }
}
