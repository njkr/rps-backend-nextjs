import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PlayerService } from 'src/player/player.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { WalletService } from 'src/wallet/wallet.service';
import { StripeService } from 'src/stripe/stripe.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  constructor(
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
    private readonly playerService: PlayerService,
    private readonly stripeService: StripeService,
  ) {}

  async handlePaymentSuccess(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const { user_id, tx_id } = session.metadata;

      const paymentIntent =
        await this.stripeService.stripe.paymentIntents.retrieve(session.id);

      const { balance_transaction } =
        await this.stripeService.getBalanceTransactions(
          paymentIntent.latest_charge,
        );

      const { fee, net } =
        await this.stripeService.getBalanceTransactionDetails(
          balance_transaction as string,
        );

      const feeAmount = fee / 100;
      const netReceived = net / 100;

      // update transaction wallet balance and player record

      const transactionDetails =
        await this.transactionService.getTransactionById(
          {
            user_id,
          },
          tx_id,
        );

      if (!transactionDetails) {
        return;
      }

      // check transaction status is pending
      if (transactionDetails.tx_status !== 'Pending') {
        return;
      }

      await this.transactionService.updateTransaction(
        { user_id },
        {
          ...transactionDetails,
          amount: netReceived,
          tx_status: 'Success',
          tx_fee: feeAmount,
          updated_balance: transactionDetails.updated_balance - feeAmount,
          tx_fee_coin_type: 'Dollar',
          remarks: transactionDetails.remarks + ' | Payment Success',
        },
      );

      await this.walletService.updateWalletBalance(
        { user_id },
        {
          amount: netReceived,
          tx_operation: 'Add',
          coin_type: 'Dollar',
          user_id,
        },
      );

      return;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    try {
      // Handle payment failure, possibly update the status in your database
      const { user_id, tx_id } = paymentIntent.metadata;

      const transactionDetails =
        await this.transactionService.getTransactionById(
          {
            user_id,
          },
          tx_id,
        );

      // check transaction status is pending
      if (transactionDetails.status !== 'pending') {
        return;
      }

      await this.transactionService.updateTransaction(
        { user_id },
        {
          ...transactionDetails,
          tx_status: 'Failed',
          updated_date: new Date().toISOString(),
          updated_balance:
            transactionDetails.updated_balance - transactionDetails.amount,
          remarks: transactionDetails.remarks + ' | Payment Failed',
        },
      );

      return;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }
}
