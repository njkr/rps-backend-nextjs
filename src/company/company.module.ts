/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';

@Module({
  imports: [DynamoModule],
  providers: [CompanyService],
  controllers: [CompanyController],
})
export class CompanyModule {}
