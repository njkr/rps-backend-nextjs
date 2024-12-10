import {
  Controller,
  Post,
  Body,
  UseGuards,
  UsePipes,
  Inject,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { REQUEST } from '@nestjs/core';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { Response } from 'express';
import { TransactionService } from 'src/transaction/transaction.service';
import { StripeService } from 'src/stripe/stripe.service';
import { PlayerService } from 'src/player/player.service';
import { WalletService } from 'src/wallet/wallet.service';
import { handleResponse } from 'src/common/utils/util-functions.utility';
import { ethers } from 'ethers';
import { TransactionSettingsService } from 'src/transaction-settings/transaction-settings.service';
import { DepositService } from 'src/deposit/deposit.service';

@Controller('payment')
@UseGuards(JwtAuthGuard)
@UsePipes(new RequestValidationPipe({ transform: true }))
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly dynamoService: DynamoService,
    private readonly stripeService: StripeService,
    private readonly playerService: PlayerService,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
    private readonly transactionSettingsService: TransactionSettingsService,
    private readonly depositService: DepositService,
  ) {}

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Post('deposit')
  async depositAmount(
    @Body() createPaymentDto: CreatePaymentDto,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();

      const { stripe_id } = await this.walletService.getWalletByUserId({
        user_id,
      });

      const generatedId =
        await this.transactionService.generateUniqueId(user_id);

      await this.transactionService.createTransaction({
        user_id,
        tx_id: generatedId,
        tx_type: 'Recharge',
        tx_operation: 'Add',
        coin_type: 'Dollar',
        amount: createPaymentDto.amount,
        tx_status: 'Pending',
        source_type: 'Payment',
        source_id: stripe_id,
        date: new Date().toISOString(),
      });

      const data = await this.stripeService.createPaymentSession({
        user_id,
        tx_id: generatedId,
        amount: createPaymentDto.amount,
        stripe_id,
      });

      return handleResponse(
        res,
        HttpStatus.CREATED,
        'Player deposit created successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error creating deposit records',
        [],
        [error.message],
      );
    }
  }

  @Post('deposit/mobile')
  async depositMobileAmount(
    @Body() createPaymentDto: CreatePaymentDto,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();

      const { stripe_id, balance_dollar } =
        await this.walletService.getWalletByUserId({
          user_id,
        });

      const generatedId =
        await this.transactionService.generateUniqueId(user_id);

      const data = await this.stripeService.createPaymentSessionMobile({
        user_id,
        tx_id: generatedId,
        amount: createPaymentDto.amount,
        stripe_id,
      });

      await this.transactionService.createTransaction({
        user_id,
        tx_id: generatedId,
        tx_type: 'Recharge',
        tx_operation: 'Add',
        coin_type: 'Dollar',
        amount: createPaymentDto.amount,
        tx_status: 'Pending',
        source_type: 'Payment',
        source_id: data.id,
        updated_balance: balance_dollar + createPaymentDto.amount,
        remarks: 'recharge from mobile',
        date: new Date().toISOString(),
      });

      return handleResponse(
        res,
        HttpStatus.CREATED,
        'Player deposit created successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error creating deposit records',
        [],
        [error.message],
      );
    }
  }

  @Post('withdraw')
  async withdrawAmount(
    @Body() createPaymentDto: CreatePaymentDto,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();

      const isValidAddress = ethers.utils.isAddress(
        createPaymentDto.wallet_address,
      );

      if (!isValidAddress) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'Invalid wallet address',
          [],
          ['Invalid wallet address'],
        );
      }

      const transactionData =
        await this.transactionService.validateAndCreateTransaction(
          { user_id },
          {
            user_id,
            tx_type: 'Withdraw',
            tx_operation: 'Remove',
            source_type: 'Payment',
            coin_type: 'Dollar',
            wallet_address: createPaymentDto.wallet_address,
            amount: createPaymentDto.amount,
            tx_status: 'Pending',
            remarks: 'withdraw to wallet requested',
            date: new Date().toISOString(),
          },
        );

      const { amount } =
        await this.transactionSettingsService.getActiveTransactionSettings();

      const isApprovalNeeded = createPaymentDto.amount >= amount;

      if (!isApprovalNeeded) {
        const amountInWei = ethers.utils.parseUnits(
          createPaymentDto.amount.toString(),
          18,
        );
        this.depositService.withdraw(
          amountInWei,
          createPaymentDto.wallet_address,
          transactionData.tx_id,
        );
      }

      return handleResponse(
        res,
        HttpStatus.CREATED,
        isApprovalNeeded
          ? 'withdraw request created successfully'
          : 'withdraw successfully',
        [],
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error creating withdraw records',
        [],
        [error.message],
      );
    }
  }
}
