import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WorkerHostProcessor } from 'src/queues/worker-host.process';
import { MarketplaceService } from 'src/marketplace/marketplace.service';

@Processor('marketplace', { concurrency: 100 })
export class MarketplaceProcessor extends WorkerHostProcessor {
  constructor(private readonly marketplaceService: MarketplaceService) {
    super(); // Call the superclass constructor
  }
  async process(job: Job<any>) {
    const { authUser, offerData, id } = job.data;

    let response = {};

    switch (job.name) {
      case 'createOffer':
        await this.marketplaceService.validateAndCreateOffer(
          authUser,
          offerData,
        );

        break;
      case 'purchaseOffer':
        response = await this.marketplaceService.purchaseOffer(offerData);

        break;

      case 'deleteOffer':
        await this.marketplaceService.deleteOffer(offerData);

        break;

      default:
        break;
    }

    return { id, response };
  }
}
