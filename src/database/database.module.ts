import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;
        return new Pool({
          connectionString,
          host: process.env.POSTGRES_HOST,
          port: process.env.POSTGRES_PORT
            ? Number(process.env.POSTGRES_PORT)
            : undefined,
          user: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DB,
          max: process.env.POSTGRES_POOL_MAX
            ? Number(process.env.POSTGRES_POOL_MAX)
            : 10,
        });
      },
    },
    DatabaseService,
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
