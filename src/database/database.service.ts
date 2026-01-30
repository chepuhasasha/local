import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Корректно закрывает пул соединений при остановке приложения.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
