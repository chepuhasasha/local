import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthOtpEntity } from '@/modules/auth/entities/auth-otp.entity';

@Injectable()
export class AuthOtpsRepository {
  constructor(
    @InjectRepository(AuthOtpEntity)
    private readonly authOtpRepository: Repository<AuthOtpEntity>,
  ) {}

  create(data: Partial<AuthOtpEntity>): AuthOtpEntity {
    return this.authOtpRepository.create(data);
  }

  async save(otp: AuthOtpEntity): Promise<AuthOtpEntity> {
    return this.authOtpRepository.save(otp);
  }

  async findById(id: number): Promise<AuthOtpEntity | null> {
    return this.authOtpRepository.findOne({ where: { id } });
  }

  async findActiveByIdentityAndHash(
    identityId: number,
    codeHash: string,
    now: Date,
  ): Promise<AuthOtpEntity | null> {
    return this.authOtpRepository
      .createQueryBuilder('otp')
      .where('otp.identity_id = :identityId', { identityId })
      .andWhere('otp.code_hash = :codeHash', { codeHash })
      .andWhere('otp.consumed_at IS NULL')
      .andWhere('otp.expires_at > :now', { now })
      .orderBy('otp.id', 'DESC')
      .getOne();
  }

  async findLatestByIdentity(
    identityId: number,
  ): Promise<AuthOtpEntity | null> {
    return this.authOtpRepository
      .createQueryBuilder('otp')
      .where('otp.identity_id = :identityId', { identityId })
      .orderBy('otp.created_at', 'DESC')
      .getOne();
  }

  async countCreatedSince(identityId: number, since: Date): Promise<number> {
    return this.authOtpRepository
      .createQueryBuilder('otp')
      .where('otp.identity_id = :identityId', { identityId })
      .andWhere('otp.created_at >= :since', { since })
      .getCount();
  }
}
