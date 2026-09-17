import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppConfig } from '../config/env';

export class StorageService {
  constructor(private readonly config: AppConfig) {}

  async save(fileName: string, data: Buffer): Promise<void> {
    await mkdir(this.config.uploadDir, { recursive: true });
    await writeFile(join(this.config.uploadDir, fileName), data);
  }

  async read(fileName: string): Promise<Buffer | null> {
    try {
      return await readFile(join(this.config.uploadDir, fileName));
    } catch {
      return null;
    }
  }

  async remove(fileName: string): Promise<void> {
    try {
      await unlink(join(this.config.uploadDir, fileName));
    } catch {
      // файл уже удалён — игнорируем
    }
  }
}
