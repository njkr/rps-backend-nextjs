import { Module } from '@nestjs/common';
import { GameTimerProcessor } from './game-timer.processor';
import { SharedModule } from 'src/shared/shared.module';
import { queues } from 'src/config/queue.config';

@Module({
  imports: [queues.gameTimer, SharedModule],
  providers: [GameTimerProcessor],
  controllers: [],
  exports: [],
})
export class GameTimerModule {}
