import { Module } from '@nestjs/common';
import { GameRoundService } from './game-round.service';
import { GameRoundController } from './game-round.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';
import { GameModule } from 'src/game/game.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { queues } from 'src/config/queue.config';

@Module({
  imports: [
    DynamoModule,
    AuthModule,
    GameModule,
    TransactionModule,
    queues.game,
  ],
  controllers: [GameRoundController],
  providers: [GameRoundService],
  exports: [GameRoundService],
})
export class GameRoundModule {}
