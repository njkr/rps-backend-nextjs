import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { WorkerHostProcessor } from 'src/queues/worker-host.process';
import { OnModuleInit } from '@nestjs/common';
import { JackpotService } from 'src/jackpot/jackpot.service';

@Processor('jackpot', { concurrency: 1 })
export class JackpotProcessor
  extends WorkerHostProcessor
  implements OnModuleInit
{
  constructor(
    private readonly jackpotService: JackpotService,
    @InjectQueue('jackpot') private readonly jackpotQueue: Queue,
  ) {
    super(); // Call the superclass constructor
  }
  onModuleInit() {
    this.jackpotQueue.setGlobalConcurrency(1);
  }

  async process(job: Job<any>) {
    const { data } = job;

    await this.jackpotService.addJackpotAndTickets(data);

    return true;
  }
}
