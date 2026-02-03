import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import jwt, { JsonWebTokenError, type JwtPayload } from 'jsonwebtoken';

import { AuthIdentitiesRepository } from '@/modules/auth/repositories/auth-identities.repository';
import { AuthOtpsRepository } from '@/modules/auth/repositories/auth-otps.repository';
import { AuthSessionsRepository } from '@/modules/auth/repositories/auth-sessions.repository';
import { AuthProvider } from '@/modules/auth/types/auth.types';
import { AuthIdentityEntity } from '@/modules/auth/entities/auth-identity.entity';
import { AuthOtpEntity } from '@/modules/auth/entities/auth-otp.entity';
import { AuthSessionEntity } from '@/modules/auth/entities/auth-session.entity';
import { UsersService } from '@/modules/users/users.service';
import type { UserDto } from '@/modules/users/dto/user.dto';
import type { AppConfig } from '@/config/configuration';
import { MailerService } from '@/infrastructure/mailer/mailer.service';
import type {
  AuthAccessPayload,
  AuthSessionToken,
} from '@/modules/auth/types/auth.types';

const REFRESH_TOKEN_BYTES = 32;

@Injectable()
export class AuthService {
  private readonly authConfig: AppConfig['auth'];

  constructor(
    private readonly identitiesRepository: AuthIdentitiesRepository,
    private readonly otpsRepository: AuthOtpsRepository,
    private readonly sessionsRepository: AuthSessionsRepository,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {
    const raw: unknown = this.configService.get('auth', { infer: true });
    if (!raw || typeof raw !== 'object') {
      throw new Error('Auth configuration is missing.');
    }
    this.authConfig = raw as AppConfig['auth'];
  }

  async startEmailAuth(email: string): Promise<{
    identity: AuthIdentityEntity;
    otp: AuthOtpEntity;
    code: string | null;
  }> {
    const authConfig = this.authConfig;
    const normalizedEmail = this.normalizeEmail(email);

    let identity = await this.identitiesRepository.findActiveByProvider(
      AuthProvider.Email,
      normalizedEmail,
    );

    if (identity) {
      let user: UserDto;
      try {
        user = await this.usersService.getById(identity.user_id);
      } catch {
        throw new UnauthorizedException('Пользователь не найден.');
      }

      if (user.archived_at) {
        throw new UnauthorizedException('Пользователь архивирован.');
      }
    }

    if (!identity) {
      const user = await this.usersService.create({
        display_name: null,
        marketing_opt_in: false,
      });

      identity = await this.createIdentity({
        userId: user.id,
        provider: AuthProvider.Email,
        providerUserId: normalizedEmail,
        isVerified: false,
      });
    }

    const code = this.generateOtpCode(authConfig.otpLength);
    const otp = await this.createOtp({
      identityId: identity.id,
      codeHash: this.hashSecret(code),
      expiresAt: new Date(Date.now() + authConfig.otpTtlSeconds * 1000),
    });

    await this.mailerService.sendOtpEmail({
      to: normalizedEmail,
      code,
      expiresAt: otp.expires_at,
    });

    return {
      identity,
      otp,
      code: this.shouldExposeOtp() ? code : null,
    };
  }

  async verifyEmailOtp(params: { email: string; code: string }): Promise<{
    userId: number;
    sessionId: number;
    accessToken: string;
    refreshToken: string;
  }> {
    const authConfig = this.authConfig;
    const normalizedEmail = this.normalizeEmail(params.email);
    if (params.code.length !== authConfig.otpLength) {
      throw new BadRequestException('Неверный или просроченный код.');
    }
    const codeHash = this.hashSecret(params.code);

    const identity = await this.identitiesRepository.findActiveByProvider(
      AuthProvider.Email,
      normalizedEmail,
    );

    if (!identity) {
      throw new NotFoundException('Identity не найдена.');
    }

    let user: UserDto;
    try {
      user = await this.usersService.getById(identity.user_id);
    } catch {
      throw new UnauthorizedException('Пользователь не найден.');
    }

    if (user.archived_at) {
      throw new UnauthorizedException('Пользователь архивирован.');
    }

    const otp = await this.otpsRepository.findActiveByIdentityAndHash(
      identity.id,
      codeHash,
      new Date(),
    );

    if (!otp) {
      throw new BadRequestException('Неверный или просроченный код.');
    }

    await this.consumeOtp(otp.id);
    await this.markIdentityVerified(identity.id);

    const refreshToken = this.generateRefreshToken();
    const session = await this.createSession({
      userId: identity.user_id,
      refreshHash: this.hashSecret(refreshToken),
    });

    return {
      userId: identity.user_id,
      sessionId: session.id,
      accessToken: this.issueAccessToken({
        userId: identity.user_id,
        sessionId: session.id,
        expiresInSeconds: authConfig.accessTtlSeconds,
      }),
      refreshToken,
    };
  }

  async refreshSession(params: {
    sessionId: number;
    refreshToken: string;
  }): Promise<{
    sessionId: number;
    accessToken: string;
    refreshToken: string;
  }> {
    const authConfig = this.authConfig;
    const session = await this.ensureSession(params.sessionId);
    if (session.revoked_at) {
      throw new UnauthorizedException('Сессия отозвана.');
    }

    if (this.isRefreshExpired(session, authConfig.refreshTtlSeconds)) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Сессия истекла.');
    }

    const expectedHash = session.refresh_hash;
    const providedHash = this.hashSecret(params.refreshToken);
    if (!this.safeEqual(expectedHash, providedHash)) {
      throw new UnauthorizedException('Неверный refresh-токен.');
    }

    const newRefreshToken = this.generateRefreshToken();
    session.refresh_hash = this.hashSecret(newRefreshToken);
    session.last_seen_at = new Date();

    await this.sessionsRepository.save(session);

    return {
      sessionId: session.id,
      accessToken: this.issueAccessToken({
        userId: session.user_id,
        sessionId: session.id,
        expiresInSeconds: authConfig.accessTtlSeconds,
      }),
      refreshToken: newRefreshToken,
    };
  }

  async logoutSession(sessionId: number): Promise<AuthSessionEntity> {
    return this.revokeSession(sessionId);
  }

  async authenticateAccessToken(token: string): Promise<{
    userId: number;
    sessionId: number;
  }> {
    const payload = this.verifyAccessToken(token);
    const session = await this.ensureSession(payload.sid);

    if (session.revoked_at) {
      throw new UnauthorizedException('Сессия отозвана.');
    }

    if (this.isRefreshExpired(session, this.authConfig.refreshTtlSeconds)) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Сессия истекла.');
    }

    if (session.user_id !== payload.sub) {
      throw new UnauthorizedException('Неверный access-токен.');
    }

    let user: UserDto;
    try {
      user = await this.usersService.getById(session.user_id);
    } catch {
      throw new UnauthorizedException('Пользователь не найден.');
    }

    if (user.archived_at) {
      throw new UnauthorizedException('Пользователь архивирован.');
    }

    session.last_seen_at = new Date();
    await this.sessionsRepository.save(session);

    return { userId: session.user_id, sessionId: session.id };
  }

  verifyAccessToken(token: string): AuthAccessPayload {
    const authConfig = this.authConfig;

    try {
      const verified = jwt.verify(token, authConfig.jwtSecret, {
        algorithms: ['HS256'],
      });
      return this.normalizeAccessPayload(verified);
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Неверный access-токен.');
      }
      throw error;
    }
  }

  private normalizeAccessPayload(raw: string | JwtPayload): AuthAccessPayload {
    if (!raw || typeof raw !== 'object') {
      throw new UnauthorizedException('Неверный access-токен.');
    }

    const record = raw as Record<string, unknown>;
    const subValue = record.sub;
    const sidValue = record.sid;
    const sub = typeof subValue === 'number' ? subValue : Number(subValue);
    const sid = typeof sidValue === 'number' ? sidValue : Number(sidValue);

    if (!Number.isFinite(sub) || !Number.isFinite(sid)) {
      throw new UnauthorizedException('Неверный access-токен.');
    }

    return {
      ...raw,
      sub,
      sid,
    };
  }

  async createIdentity(params: {
    userId: number;
    provider: AuthProvider;
    providerUserId: string;
    isVerified?: boolean;
  }): Promise<AuthIdentityEntity> {
    const identity = this.identitiesRepository.create({
      user_id: params.userId,
      provider: params.provider,
      provider_user_id: params.providerUserId,
      is_verified: params.isVerified ?? false,
      verified_at: params.isVerified ? new Date() : null,
      archived_at: null,
    });

    return this.identitiesRepository.save(identity);
  }

  async markIdentityVerified(id: number): Promise<AuthIdentityEntity> {
    const identity = await this.ensureIdentity(id);
    if (identity.is_verified) {
      return identity;
    }

    identity.is_verified = true;
    identity.verified_at = new Date();
    return this.identitiesRepository.save(identity);
  }

  async createOtp(params: {
    identityId: number;
    codeHash: string;
    expiresAt: Date;
  }): Promise<AuthOtpEntity> {
    const otp = this.otpsRepository.create({
      identity_id: params.identityId,
      code_hash: params.codeHash,
      expires_at: params.expiresAt,
      consumed_at: null,
    });

    return this.otpsRepository.save(otp);
  }

  async consumeOtp(id: number): Promise<AuthOtpEntity> {
    const otp = await this.ensureOtp(id);
    if (otp.consumed_at) {
      return otp;
    }

    otp.consumed_at = new Date();
    return this.otpsRepository.save(otp);
  }

  async createSession(params: {
    userId: number;
    refreshHash: string;
  }): Promise<AuthSessionEntity> {
    const session = this.sessionsRepository.create({
      user_id: params.userId,
      refresh_hash: params.refreshHash,
      last_seen_at: null,
      revoked_at: null,
    });

    return this.sessionsRepository.save(session);
  }

  async revokeSession(id: number): Promise<AuthSessionEntity> {
    const session = await this.ensureSession(id);
    if (session.revoked_at) {
      return session;
    }

    session.revoked_at = new Date();
    return this.sessionsRepository.save(session);
  }

  private async ensureIdentity(id: number): Promise<AuthIdentityEntity> {
    const identity = await this.identitiesRepository.findById(id);
    if (!identity) {
      throw new NotFoundException('Identity не найдена.');
    }
    return identity;
  }

  private async ensureOtp(id: number): Promise<AuthOtpEntity> {
    const otp = await this.otpsRepository.findById(id);
    if (!otp) {
      throw new NotFoundException('OTP не найден.');
    }
    return otp;
  }

  private async ensureSession(id: number): Promise<AuthSessionEntity> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) {
      throw new NotFoundException('Сессия не найдена.');
    }
    return session;
  }

  private normalizeEmail(email: string): string {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Email обязателен.');
    }
    return normalized;
  }

  private generateOtpCode(length: number): string {
    const raw = randomInt(0, 10 ** length);
    return raw.toString().padStart(length, '0');
  }

  private generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  }

  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  private issueAccessToken(params: AuthSessionToken): string {
    const payload: AuthAccessPayload = {
      sub: params.userId,
      sid: params.sessionId,
    };

    return jwt.sign(payload, this.authConfig.jwtSecret, {
      expiresIn: params.expiresInSeconds,
      algorithm: 'HS256',
    });
  }

  private isRefreshExpired(
    session: AuthSessionEntity,
    refreshTtlSeconds: number,
  ): boolean {
    const createdAt = session.created_at?.getTime?.();
    if (!createdAt) {
      return false;
    }
    return Date.now() - createdAt > refreshTtlSeconds * 1000;
  }

  private shouldExposeOtp(): boolean {
    return process.env.NODE_ENV !== 'production';
  }
}
