import { Module } from '@nestjs/common';
import { queues } from 'src/config/queue.config';
import { MarketplaceModule } from 'src/marketplace/marketplace.module';
import { MarketplaceProcessor } from './marketplace.processor';

@Module({
  imports: [queues.marketplace, MarketplaceModule],
  providers: [MarketplaceProcessor],
  controllers: [],
  exports: [],
})
export class MarketplaceQueueModule {}
