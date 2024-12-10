/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { JackpotService } from './jackpot.service';
import { JackpotController } from './jackpot.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { JackpotLookupService } from './jackpot-lookup.service';
import { TicketsModule } from 'src/ticket/ticket.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { CurrencyRatesModule } from 'src/currency-rates/currency-rates.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { queues } from 'src/config/queue.config';

@Module({
  imports: [DynamoModule, TicketsModule, TransactionModule, CurrencyRatesModule, WalletModule, queues.jackpot,],
  providers: [JackpotService, JackpotLookupService],
  controllers: [JackpotController],
  exports: [JackpotService],
})
export class JackpotModule { }
