import { Module } from '@nestjs/common';
import { JackpotProcessor } from './jackpot.processor';
import { queues } from 'src/config/queue.config';
import { JackpotModule } from 'src/jackpot/jackpot.module';

@Module({
  imports: [queues.jackpot, JackpotModule],
  providers: [JackpotProcessor],
  controllers: [],
  exports: [],
})
export class JackpotQueueModule {}
