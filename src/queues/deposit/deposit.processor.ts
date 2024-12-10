import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WorkerHostProcessor } from 'src/queues/worker-host.process';
import { TransactionService } from 'src/transaction/transaction.service';

@Processor('deposit', { concurrency: 10 })
export class DepositProcessor extends WorkerHostProcessor {
  constructor(private readonly transactionService: TransactionService) {
    super(); // Call the superclass constructor
  }

  async process(job: Job<any>) {
    const { data } = job;

    const { amount, transactionHash, user_id } = data;

    await this.transactionService.validateAndCreateTransaction(
      { user_id: user_id },
      {
        user_id: user_id,
        tx_type: 'Recharge',
        tx_status: 'Success',
        tx_operation: 'Add',
        coin_type: 'Dollar',
        amount: amount,
        source_type: 'Payment',
        source_id: transactionHash,
        remarks: 'wallet recharged',
        date: new Date().toISOString(),
      },
    );

    return true;
  }
}
