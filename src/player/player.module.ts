/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PlayerController } from './player.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigModuleApp } from 'src/config/config.module';
import { TicketsModule } from 'src/ticket/ticket.module';
import { AppConfigModule } from 'src/app-config/app-config.module';

@Module({
  imports: [DynamoModule, AuthModule, ConfigModuleApp, forwardRef(() => TicketsModule), AppConfigModule],
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService]
})
export class PlayerModule { }
