/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { DynamoService } from './dynamo.service';
import { ConfigModuleApp } from 'src/config/config.module';

@Module({
  imports: [ConfigModuleApp],
  providers: [DynamoService],
  exports: [DynamoService],
})
export class DynamoModule {}
