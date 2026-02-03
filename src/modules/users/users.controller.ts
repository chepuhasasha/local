import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { UsersService } from '@/modules/users/users.service';
import { CreateUserRequest } from '@/modules/users/dto/create-user.dto';
import { UpdateUserRequest } from '@/modules/users/dto/update-user.dto';
import { UserDto } from '@/modules/users/dto/user.dto';
import { AccessTokenGuard } from '@/modules/auth/guards/access-token.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/types/auth.types';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Создаёт нового пользователя.
   */
  @ApiBody({ type: CreateUserRequest })
  @ApiCreatedResponse({ type: UserDto })
  @Post()
  async create(@Body() request: CreateUserRequest): Promise<UserDto> {
    return this.usersService.create(request);
  }

  /**
   * Возвращает пользователя по идентификатору.
   */
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: UserDto })
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Get(':id')
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
  ): Promise<UserDto> {
    this.ensureSelf(user, id);
    return this.usersService.getById(id);
  }

  /**
   * Обновляет профиль пользователя.
   */
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateUserRequest })
  @ApiOkResponse({ type: UserDto })
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateUserRequest,
    @CurrentUser() user: AuthenticatedUser | null,
  ): Promise<UserDto> {
    this.ensureSelf(user, id);
    return this.usersService.update(id, request);
  }

  /**
   * Фиксирует принятие условий пользования.
   */
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: UserDto })
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Post(':id/accept-terms')
  async acceptTerms(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
  ): Promise<UserDto> {
    this.ensureSelf(user, id);
    return this.usersService.acceptTerms(id);
  }

  /**
   * Фиксирует принятие политики приватности.
   */
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: UserDto })
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Post(':id/accept-privacy')
  async acceptPrivacy(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
  ): Promise<UserDto> {
    this.ensureSelf(user, id);
    return this.usersService.acceptPrivacy(id);
  }

  /**
   * Архивирует пользователя.
   */
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: UserDto })
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @Delete(':id')
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
  ): Promise<UserDto> {
    this.ensureSelf(user, id);
    return this.usersService.archive(id);
  }

  private ensureSelf(user: AuthenticatedUser | null, userId: number): void {
    if (!user || user.userId !== userId) {
      throw new ForbiddenException('Недостаточно прав для доступа к профилю.');
    }
  }
}
