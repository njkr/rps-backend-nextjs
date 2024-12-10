import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [DynamoModule, AuthModule],
  controllers: [RewardController],
  providers: [RewardService],
})
export class RewardModule {}
