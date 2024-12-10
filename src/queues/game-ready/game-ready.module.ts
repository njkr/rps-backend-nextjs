import { Module } from '@nestjs/common';
import { GameReadyProcessor } from './game-ready.processor';
import { SharedModule } from 'src/shared/shared.module';
import { queues } from 'src/config/queue.config';

@Module({
  imports: [queues.gameReady, SharedModule],
  providers: [GameReadyProcessor],
  controllers: [],
  exports: [],
})
export class GameReadyModule {}
