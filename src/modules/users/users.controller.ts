import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
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
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.usersService.getById(id);
  }

  /**
   * Обновляет профиль пользователя.
   */
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateUserRequest })
  @ApiOkResponse({ type: UserDto })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateUserRequest,
  ): Promise<UserDto> {
    return this.usersService.update(id, request);
  }

  /**
   * Фиксирует принятие условий пользования.
   */
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: UserDto })
  @Post(':id/accept-terms')
  async acceptTerms(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.usersService.acceptTerms(id);
  }

  /**
   * Фиксирует принятие политики приватности.
   */
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: UserDto })
  @Post(':id/accept-privacy')
  async acceptPrivacy(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.usersService.acceptPrivacy(id);
  }

  /**
   * Архивирует пользователя.
   */
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: UserDto })
  @Delete(':id')
  async archive(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.usersService.archive(id);
  }
}
