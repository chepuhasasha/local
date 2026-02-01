import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AddressesModule } from './addresses/addresses.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    AddressesModule,
  ],
})
export class AppModule {}
