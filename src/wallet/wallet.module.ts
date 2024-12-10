/* eslint-disable prettier/prettier */
import { forwardRef, Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { PlayerModule } from 'src/player/player.module';
import { DepositModule } from 'src/deposit/deposit.module';

@Module({
  imports: [DynamoModule, AuthModule, StripeModule, PlayerModule, forwardRef(() => DepositModule)],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule { }
