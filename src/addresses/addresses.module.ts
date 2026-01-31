import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { AddressLoaderService } from './address-loader.service';
import { AddressEntity } from './entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AddressEntity])],
  controllers: [AddressesController],
  providers: [AddressesService, AddressLoaderService],
})
export class AddressesModule {}
