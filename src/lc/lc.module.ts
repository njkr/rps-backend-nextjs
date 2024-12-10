import { Module } from '@nestjs/common';
import { LcService } from './lc.service';
import { LcController } from './lc.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [DynamoModule, AuthModule],
  controllers: [LcController],
  providers: [LcService],
})
export class LcModule {}
