/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigModuleApp } from 'src/config/config.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { queues } from 'src/config/queue.config';

@Module({
  imports: [DynamoModule, AuthModule, ConfigModuleApp, TransactionModule, WalletModule, queues.marketplace],
  providers: [MarketplaceService],
  controllers: [MarketplaceController],
  exports: [MarketplaceService],
})
export class MarketplaceModule { }
