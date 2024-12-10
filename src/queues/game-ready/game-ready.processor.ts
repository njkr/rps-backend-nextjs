import { InjectQueue, Processor } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { SharedService } from 'src/shared/shared.service';
import { WorkerHostProcessor } from 'src/queues/worker-host.process';
import { OnModuleInit } from '@nestjs/common';

@Processor('game-ready', { concurrency: 1 })
export class GameReadyProcessor
  extends WorkerHostProcessor
  implements OnModuleInit
{
  constructor(
    private readonly sharedService: SharedService,
    @InjectQueue('game-ready') private readonly gameReadyQueue: Queue,
  ) {
    super(); // Call the superclass constructor
  }
  onModuleInit() {
    this.gameReadyQueue.setGlobalConcurrency(1);
  }

  async process(job: Job<any>) {
    const { data } = job;

    await this.sharedService.handleGameReady(data);

    return true;
  }
}
