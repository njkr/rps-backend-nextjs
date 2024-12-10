/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigModuleApp } from 'src/config/config.module';
import { PlayerModule } from 'src/player/player.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [
    DynamoModule,
    AuthModule,
    ConfigModuleApp,
    PlayerModule,
    WalletModule,
    TransactionModule,
    GameModule
  ],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule { }
