import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitUsersAndAuth20260203120000 implements MigrationInterface {
  name = 'InitUsersAndAuth20260203120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE auth_provider AS ENUM ('EMAIL')`);

    await queryRunner.query(`
      CREATE TABLE users (
        id BIGSERIAL PRIMARY KEY,
        display_name TEXT,
        terms_accepted_at TIMESTAMPTZ,
        privacy_accepted_at TIMESTAMPTZ,
        marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE auth_identity (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id),
        provider auth_provider NOT NULL,
        provider_user_id TEXT NOT NULL,
        is_verified BOOLEAN NOT NULL DEFAULT false,
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE auth_otp (
        id BIGSERIAL PRIMARY KEY,
        identity_id BIGINT NOT NULL REFERENCES auth_identity(id),
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE auth_session (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id),
        refresh_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX auth_identity_provider_user_id_active_idx
      ON auth_identity (provider, provider_user_id)
      WHERE archived_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX auth_otp_identity_idx
      ON auth_otp (identity_id)
    `);

    await queryRunner.query(`
      CREATE INDEX auth_session_user_idx
      ON auth_session (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS auth_session_user_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS auth_otp_identity_idx`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS auth_identity_provider_user_id_active_idx`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS auth_session`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_otp`);
    await queryRunner.query(`DROP TABLE IF EXISTS auth_identity`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);

    await queryRunner.query(`DROP TYPE IF EXISTS auth_provider`);
  }
}
