import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';
import { PlanModule } from 'src/plan/plan.module';
import { GameModule } from 'src/game/game.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { PlayerModule } from 'src/player/player.module';
import { queues } from 'src/config/queue.config';

@Module({
  imports: [
    DynamoModule,
    AuthModule,
    PlanModule,
    GameModule,
    WalletModule,
    TransactionModule,
    PlayerModule,
    queues.gameTimer,
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
