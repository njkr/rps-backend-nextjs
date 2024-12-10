import { Module } from '@nestjs/common';
import { SharedGateway } from './shared.gateway';
import { RoomModule } from 'src/room/room.module';
import { RoomWaitingListModule } from 'src/room-waiting-list/room-waiting-list.module';
import { SharedService } from './shared.service';
import { ConfigModuleApp } from 'src/config/config.module';
import { GameModule } from 'src/game/game.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { AuthModule } from 'src/auth/auth.module';
import { PlayerModule } from 'src/player/player.module';
import { queues } from 'src/config/queue.config';
import { TicketsModule } from 'src/ticket/ticket.module';
@Module({
  imports: [
    AuthModule,
    RoomModule,
    RoomWaitingListModule,
    ConfigModuleApp,
    RoomModule,
    GameModule,
    WalletModule,
    TransactionModule,
    PlayerModule,
    queues.gameTimer,
    queues.gameReady,
    queues.game,
    TicketsModule,
  ],
  providers: [SharedGateway, SharedService],
  exports: [SharedGateway, SharedService],
})
export class SharedModule {}
