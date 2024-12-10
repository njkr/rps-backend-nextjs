import { Controller, Headers, Post, Req, Res } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentService } from '../payment.service';
import { Response } from 'express';
import { StripeService } from 'src/stripe/stripe.service';

@Controller('stripe-web-hook')
export class StripeWebHookController {
  private stripe: Stripe;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeService: StripeService,
  ) {}

  @Post()
  async handleStripeWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      //convert request body to buffer
      event = await this.stripeService.constructEvent(
        req.body as unknown as Buffer,
        signature,
      );
    } catch (err) {
      console.log(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
      case 'payment_intent.succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.paymentService.handlePaymentSuccess(session);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.paymentService.handlePaymentFailure(paymentIntent);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
}
