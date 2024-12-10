import { Module } from '@nestjs/common';
import { CurrencyRatesService } from './currency-rates.service';
import { DynamoModule } from 'src/dynamo/dynamo.module';

@Module({
  imports: [DynamoModule],
  providers: [CurrencyRatesService],
  exports: [CurrencyRatesService],
})
export class CurrencyRatesModule {}
