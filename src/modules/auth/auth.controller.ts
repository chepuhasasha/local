import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from '@/modules/auth/auth.service';
import {
  AuthEmailStartRequest,
  AuthEmailStartResponse,
} from '@/modules/auth/dto/auth-email-start.dto';
import {
  AuthEmailVerifyRequest,
  AuthEmailVerifyResponse,
} from '@/modules/auth/dto/auth-email-verify.dto';
import {
  AuthRefreshRequest,
  AuthRefreshResponse,
} from '@/modules/auth/dto/auth-refresh.dto';
import {
  AuthLogoutRequest,
  AuthLogoutResponse,
} from '@/modules/auth/dto/auth-logout.dto';
import { AccessTokenGuard } from '@/modules/auth/guards/access-token.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/auth.types';
import { UsersService } from '@/modules/users/users.service';
import { UserDto } from '@/modules/users/dto/user.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Запрашивает OTP по email.
   */
  @ApiBody({ type: AuthEmailStartRequest })
  @ApiOkResponse({ type: AuthEmailStartResponse })
  @Post('email/start')
  async startEmail(
    @Body() request: AuthEmailStartRequest,
  ): Promise<AuthEmailStartResponse> {
    const { identity, otp, code } = await this.authService.startEmailAuth(
      request.email,
    );

    return {
      identity_id: identity.id,
      otp_id: otp.id,
      expires_at: otp.expires_at.toISOString(),
      code,
    };
  }

  /**
   * Проверяет OTP и создаёт сессию.
   */
  @ApiBody({ type: AuthEmailVerifyRequest })
  @ApiOkResponse({ type: AuthEmailVerifyResponse })
  @Post('email/verify')
  async verifyEmail(
    @Body() request: AuthEmailVerifyRequest,
  ): Promise<AuthEmailVerifyResponse> {
    const response = await this.authService.verifyEmailOtp({
      email: request.email,
      code: request.code,
    });

    return {
      user_id: response.userId,
      session_id: response.sessionId,
      access_token: response.accessToken,
      refresh_token: response.refreshToken,
    };
  }

  /**
   * Обновляет refresh-сессию.
   */
  @ApiBody({ type: AuthRefreshRequest })
  @ApiOkResponse({ type: AuthRefreshResponse })
  @Post('refresh')
  async refresh(
    @Body() request: AuthRefreshRequest,
  ): Promise<AuthRefreshResponse> {
    const response = await this.authService.refreshSession({
      sessionId: request.session_id,
      refreshToken: request.refresh_token,
    });

    return {
      session_id: response.sessionId,
      access_token: response.accessToken,
      refresh_token: response.refreshToken,
    };
  }

  /**
   * Отзывает сессию.
   */
  @ApiBody({ type: AuthLogoutRequest })
  @ApiOkResponse({ type: AuthLogoutResponse })
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser | null,
    @Body() request: AuthLogoutRequest,
  ): Promise<AuthLogoutResponse> {
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден.');
    }

    if (request.session_id !== user.sessionId) {
      throw new ForbiddenException('Недостаточно прав для отзыва сессии.');
    }

    const session = await this.authService.logoutSession(request.session_id);
    return {
      session_id: session.id,
      revoked_at: session.revoked_at?.toISOString() ?? new Date().toISOString(),
    };
  }

  /**
   * Возвращает профиль текущего пользователя.
   */
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserDto })
  @UseGuards(AccessTokenGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser | null): Promise<UserDto> {
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден.');
    }

    return this.usersService.getById(user.userId);
  }
}
