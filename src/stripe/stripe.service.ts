import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import Stripe from 'stripe';
import { StripeCustomerCreationDto } from './dto/stripe-customer-creation.dto';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  stripe: Stripe;

  constructor(private readonly configService: AppConfigService) {
    this.stripe = new Stripe(this.configService.stripeSecretKey, {
      apiVersion: '2022-11-15' as '2024-06-20',
    });
  }

  async createStripeCustomer(
    stripeCustomerCreationDto: StripeCustomerCreationDto,
  ): Promise<string> {
    try {
      const existingCustomers = await this.stripe.customers.list({
        email: stripeCustomerCreationDto.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0].id;
      }

      // Create a new customer if not found
      const customer = await this.stripe.customers.create({
        email: stripeCustomerCreationDto.email,
        metadata: {
          user_id: stripeCustomerCreationDto.user_id,
          wallet_id: stripeCustomerCreationDto.wallet_id,
        },
      });

      return customer.id;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async createPaymentSession(
    createPaymentSessionDto: CreatePaymentSessionDto,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    try {
      const {
        user_id,
        amount,
        tx_id,
        stripe_id: stripe_customer_id,
      } = createPaymentSessionDto;

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer: stripe_customer_id,
        line_items: [
          {
            price_data: {
              currency: 'USD',
              product_data: {
                name: 'Buy Dollar',
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          user_id,
          tx_id,
          type: 'deposit',
        },
        success_url:
          'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:3000/cancel',
      });

      return session;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async createPaymentSessionMobile(
    createPaymentSessionDto: CreatePaymentSessionDto,
  ): Promise<any> {
    try {
      const {
        user_id,
        amount,
        tx_id,
        stripe_id: stripe_customer_id,
      } = createPaymentSessionDto;

      const ephemeralKey = await this.stripe.ephemeralKeys.create(
        { customer: stripe_customer_id },
        { apiVersion: '2022-11-15' },
      );

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // Stripe processes amounts in cents
        currency: 'USD',
        customer: stripe_customer_id,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          user_id,
          tx_id,
          type: 'Deposit',
        },
      });

      return {
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: stripe_customer_id,
        publishableKey: this.configService.stripePublicKey,
        id: paymentIntent.id,
      };
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
        {
          expand: ['charges'],
        },
      );
      return paymentIntent;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getBalanceTransactions(
    changesId: string | Stripe.Charge | null,
  ): Promise<Stripe.Charge> {
    try {
      const response = await this.stripe.charges.retrieve(changesId as string);
      return response;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getBalanceTransactionDetails(
    balance_transaction: string,
  ): Promise<Stripe.Response<Stripe.BalanceTransaction>> {
    try {
      return await this.stripe.balanceTransactions.retrieve(
        balance_transaction,
      );
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async constructEvent(body: Buffer, signature: string): Promise<Stripe.Event> {
    try {
      return this.stripe.webhooks.constructEvent(
        body as unknown as Buffer,
        signature,
        this.configService.stripeWebhookSecret,
      );
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async payout(
    createPaymentSessionDto: CreatePaymentSessionDto,
  ): Promise<Stripe.Response<Stripe.Payout>> {
    try {
      await this.stripe.customers.retrieve(createPaymentSessionDto.stripe_id);
      const payout = await this.stripe.payouts.create(
        {
          amount: Math.round(createPaymentSessionDto.amount * 100),
          currency: 'usd',
          metadata: {
            user_id: createPaymentSessionDto.user_id,
            tx_id: createPaymentSessionDto.tx_id,
            type: 'payout',
          },
        },
        {
          stripeAccount: createPaymentSessionDto.stripe_id,
        },
      );
      return payout;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }
}
