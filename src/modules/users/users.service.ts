import { Injectable, NotFoundException } from '@nestjs/common';

import { UsersRepository } from '@/modules/users/repositories/users.repository';
import { CreateUserRequest } from '@/modules/users/dto/create-user.dto';
import { UpdateUserRequest } from '@/modules/users/dto/update-user.dto';
import { UserDto } from '@/modules/users/dto/user.dto';
import { UserEntity } from '@/modules/users/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserRequest): Promise<UserDto> {
    const user = this.usersRepository.create({
      display_name: dto.display_name ?? null,
      marketing_opt_in: dto.marketing_opt_in ?? false,
      terms_accepted_at: null,
      privacy_accepted_at: null,
      archived_at: null,
    });

    const saved = await this.usersRepository.save(user);
    return this.toDto(saved);
  }

  async getById(id: number): Promise<UserDto> {
    const user = await this.ensureUser(id);
    return this.toDto(user);
  }

  async update(id: number, dto: UpdateUserRequest): Promise<UserDto> {
    const user = await this.ensureUser(id);

    if (dto.display_name !== undefined) {
      user.display_name = dto.display_name ?? null;
    }

    if (dto.marketing_opt_in !== undefined) {
      user.marketing_opt_in = dto.marketing_opt_in;
    }

    const saved = await this.usersRepository.save(user);
    return this.toDto(saved);
  }

  async acceptTerms(id: number): Promise<UserDto> {
    const user = await this.ensureUser(id);
    if (user.terms_accepted_at) {
      return this.toDto(user);
    }

    user.terms_accepted_at = new Date();
    const saved = await this.usersRepository.save(user);
    return this.toDto(saved);
  }

  async acceptPrivacy(id: number): Promise<UserDto> {
    const user = await this.ensureUser(id);
    if (user.privacy_accepted_at) {
      return this.toDto(user);
    }

    user.privacy_accepted_at = new Date();
    const saved = await this.usersRepository.save(user);
    return this.toDto(saved);
  }

  async archive(id: number): Promise<UserDto> {
    const user = await this.ensureUser(id);
    if (user.archived_at) {
      return this.toDto(user);
    }

    user.archived_at = new Date();
    const saved = await this.usersRepository.save(user);
    return this.toDto(saved);
  }

  private async ensureUser(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Пользователь не найден.');
    }
    return user;
  }

  private toDto(user: UserEntity): UserDto {
    return {
      id: Number(user.id),
      display_name: user.display_name ?? null,
      terms_accepted_at: user.terms_accepted_at
        ? user.terms_accepted_at.toISOString()
        : null,
      privacy_accepted_at: user.privacy_accepted_at
        ? user.privacy_accepted_at.toISOString()
        : null,
      marketing_opt_in: user.marketing_opt_in,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
      archived_at: user.archived_at ? user.archived_at.toISOString() : null,
    };
  }
}
