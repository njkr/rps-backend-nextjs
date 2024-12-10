/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModuleApp } from './config/config.module';
import { DynamoModule } from './dynamo/dynamo.module';
import { PlayerModule } from './player/player.module';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './auth/auth.module';
import { JwtStrategy } from './auth/jwt.strategy';
import { RewardModule } from './reward/reward.module';
import { LcModule } from './lc/lc.module';
import { TicketsModule } from './ticket/ticket.module';
import { JackpotModule } from './jackpot/jackpot.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AiModule } from './ai/ai.module';
import { GameModule } from './game/game.module';
import { GameRoundModule } from './game-round/game-round.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionModule } from './transaction/transaction.module';
import { PlanModule } from './plan/plan.module';
import { RoomModule } from './room/room.module';
import { PaymentModule } from './payment/payment.module';
import { StripeModule } from './stripe/stripe.module';
import { RoomWaitingListModule } from './room-waiting-list/room-waiting-list.module';
import { SharedModule } from './shared/shared.module';
import { AdminModule } from './admin/admin.module';
import { CurrencyRatesModule } from './currency-rates/currency-rates.module';
import { queueConfig } from './config/queue.config';
import { GameTimerModule } from './queues/game-timer/game-timer.module';
import { GameReadyModule } from './queues/game-ready/game-ready.module';
import { MarketplaceQueueModule } from './queues/marketplace/marketplace.module';
import { GameQueueModule } from './queues/game/game.module';
import { JackpotQueueModule } from './queues/jackpot/jackpot.module';
import { DepositModule } from './deposit/deposit.module';
import { DepositQueueModule } from './queues/deposit/deposit.module';
import { TransactionSettingsModule } from './transaction-settings/transaction-settings.module';
import { AppConfigModule } from './app-config/app-config.module';

@Module({
  imports: [
    queueConfig,
    PlayerModule,
    ConfigModuleApp,
    DynamoModule,
    PassportModule,
    AuthModule,
    RewardModule,
    LcModule,
    TicketsModule,
    JackpotModule,
    MarketplaceModule,
    AiModule,
    GameModule,
    GameRoundModule,
    WalletModule,
    TransactionModule,
    PlanModule,
    RoomModule,
    PaymentModule,
    StripeModule,
    RoomWaitingListModule,
    SharedModule,
    AdminModule,
    CurrencyRatesModule,
    GameTimerModule,
    GameReadyModule,
    MarketplaceQueueModule,
    GameQueueModule,
    JackpotQueueModule,
    DepositModule,
    DepositQueueModule,
    TransactionSettingsModule,
    AppConfigModule,
  ],
  controllers: [],
  providers: [
    AppService,
    JwtStrategy,
  ],
})
export class AppModule { }
