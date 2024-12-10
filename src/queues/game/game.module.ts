import { Module } from '@nestjs/common';
import { queues } from 'src/config/queue.config';
import { GameProcessor } from './game.processor';
import { GameModule } from 'src/game/game.module';
import { GameRoundModule } from 'src/game-round/game-round.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [queues.game, GameModule, GameRoundModule, SharedModule],
  providers: [GameProcessor],
  controllers: [],
  exports: [],
})
export class GameQueueModule {}
