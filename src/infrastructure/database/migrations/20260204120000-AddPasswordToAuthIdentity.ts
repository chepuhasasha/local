import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordToAuthIdentity20260204120000
  implements MigrationInterface
{
  name = 'AddPasswordToAuthIdentity20260204120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth_identity
      ADD COLUMN password_hash TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE auth_identity
      ADD COLUMN password_updated_at TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth_identity
      DROP COLUMN IF EXISTS password_updated_at
    `);

    await queryRunner.query(`
      ALTER TABLE auth_identity
      DROP COLUMN IF EXISTS password_hash
    `);
  }
}
