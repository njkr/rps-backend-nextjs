import { Module } from '@nestjs/common';
import { TransactionSettingsService } from './transaction-settings.service';
import { DynamoModule } from 'src/dynamo/dynamo.module';

@Module({
  imports: [DynamoModule],
  providers: [TransactionSettingsService],
  exports: [TransactionSettingsService],
})
export class TransactionSettingsModule {}
