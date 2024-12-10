import { forwardRef, Module } from '@nestjs/common';
import { DepositService } from './deposit.service';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { PlayerModule } from 'src/player/player.module';
import { queues } from 'src/config/queue.config';
import { TransactionModule } from 'src/transaction/transaction.module';

@Module({
  imports: [
    DynamoModule,
    PlayerModule,
    queues.deposit,
    forwardRef(() => TransactionModule),
  ],
  providers: [DepositService],
  exports: [DepositService],
})
export class DepositModule {}
