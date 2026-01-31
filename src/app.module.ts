import { Module } from '@nestjs/common';
import { AddressesModule } from './addresses/addresses.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AddressesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
