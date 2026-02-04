import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from '@/modules/users/users.service';
import { UsersRepository } from '@/modules/users/repositories/users.repository';
import { UserEntity } from '@/modules/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
