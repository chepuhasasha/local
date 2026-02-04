import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Сервис очистки доменных таблиц (без адресных слепков).
 */
@Injectable()
export class DbCleanService {
  private readonly logger = new Logger(DbCleanService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Очищает доменные таблицы и сбрасывает счётчики идентификаторов.
   */
  async cleanDomainTables(): Promise<void> {
    this.logger.warn(
      'Cleaning domain tables: users, auth_identity, auth_otp, auth_session.',
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.query(`
        TRUNCATE TABLE
          auth_otp,
          auth_session,
          auth_identity,
          users
        RESTART IDENTITY
        CASCADE
      `);
    });

    this.logger.log('Database cleanup completed.');
  }
}
