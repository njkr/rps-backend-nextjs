import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { AuthModule } from 'src/auth/auth.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { PlayerModule } from 'src/player/player.module';
import { StripeWebHookController } from './stripe-web-hook/stripe-web-hook.controller';
import { TransactionSettingsModule } from 'src/transaction-settings/transaction-settings.module';
import { DepositModule } from 'src/deposit/deposit.module';

@Module({
  imports: [
    DynamoModule,
    AuthModule,
    StripeModule,
    PlayerModule,
    WalletModule,
    TransactionModule,
    TransactionSettingsModule,
    DepositModule,
  ],
  controllers: [PaymentController, StripeWebHookController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
