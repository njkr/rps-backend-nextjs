import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SharedService } from 'src/shared/shared.service';
import { WorkerHostProcessor } from 'src/queues/worker-host.process';

@Processor('game-timer', { concurrency: 100 })
export class GameTimerProcessor extends WorkerHostProcessor {
  constructor(private readonly sharedService: SharedService) {
    super(); // Call the superclass constructor
  }
  async process(job: Job<any>) {
    const { data } = job;

    await this.sharedService.handleGameTimer(data, job.name);

    return true;
  }
}
