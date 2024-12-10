import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { GameModule } from 'src/game/game.module';
import { AuthModule } from 'src/auth/auth.module';
import { PlayerModule } from 'src/player/player.module';
import { MarketplaceModule } from 'src/marketplace/marketplace.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { DepositModule } from 'src/deposit/deposit.module';

@Module({
  imports: [
    AuthModule,
    GameModule,
    MarketplaceModule,
    PlayerModule,
    TransactionModule,
    WalletModule,
    DepositModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
