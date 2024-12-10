import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ConfigModuleApp } from 'src/config/config.module';

@Module({
  imports: [ConfigModuleApp],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
