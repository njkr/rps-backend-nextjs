import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { PlayerModule } from 'src/player/player.module';
import { queues } from 'src/config/queue.config';
import { JackpotModule } from 'src/jackpot/jackpot.module';
import { TicketsModule } from 'src/ticket/ticket.module';
import { AppConfigModule } from 'src/app-config/app-config.module';

@Module({
  imports: [
    DynamoModule,
    AuthModule,
    WalletModule,
    TransactionModule,
    PlayerModule,
    queues.gameTimer,
    queues.game,
    queues.jackpot,
    AuthModule,
    JackpotModule,
    TicketsModule,
    AppConfigModule
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule { }
