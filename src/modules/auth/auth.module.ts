import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthIdentityEntity } from '@/modules/auth/entities/auth-identity.entity';
import { AuthOtpEntity } from '@/modules/auth/entities/auth-otp.entity';
import { AuthSessionEntity } from '@/modules/auth/entities/auth-session.entity';
import { AuthService } from '@/modules/auth/auth.service';
import { AuthIdentitiesRepository } from '@/modules/auth/repositories/auth-identities.repository';
import { AuthOtpsRepository } from '@/modules/auth/repositories/auth-otps.repository';
import { AuthSessionsRepository } from '@/modules/auth/repositories/auth-sessions.repository';
import { AuthController } from '@/modules/auth/auth.controller';
import { UsersModule } from '@/modules/users/users.module';
import { MailerModule } from '@/infrastructure/mailer/mailer.module';
import { AccessTokenGuard } from '@/modules/auth/guards/access-token.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthIdentityEntity,
      AuthOtpEntity,
      AuthSessionEntity,
    ]),
    UsersModule,
    MailerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthIdentitiesRepository,
    AuthOtpsRepository,
    AuthSessionsRepository,
    AccessTokenGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
