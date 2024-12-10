import { Module } from '@nestjs/common';
import { DepositProcessor } from './deposit.processor';
import { queues } from 'src/config/queue.config';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [queues.deposit, TransactionModule],
  providers: [DepositProcessor],
})
export class DepositQueueModule {}
