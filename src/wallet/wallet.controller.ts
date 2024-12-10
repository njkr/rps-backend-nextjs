/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, HttpStatus, Inject, Param, Res, UseGuards, UsePipes } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { Response } from 'express';
import { REQUEST } from '@nestjs/core';
import { IUser, UserRequest } from 'src/common/interfaces/user-request.interface';
import { handleResponse } from 'src/common/utils/util-functions.utility';
import { DepositService } from 'src/deposit/deposit.service';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly dynamoService: DynamoService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly depositService: DepositService
  ) { }

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllWallets(@Res() res: Response): Promise<any> {
    try {
      const data = await this.walletService.getAllWallets();
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'all wallets fetched successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving all wallets',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserWallet(@Res() res: Response): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // get data
      const data = await this.walletService.getWalletByUserId(authUser);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'user wallet fetched successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving user wallet',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Get('user/:wallet_id')
  @UseGuards(JwtAuthGuard)
  async getWalletByWalletID(
    @Param('wallet_id') wallet_id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get data
      const data = await this.walletService.getWalletById(wallet_id);

      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'user wallet fetched successfully',
        data: data,
        errors: [],
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error retrieving user wallet',
        errors: [error.message],
        data: [],
      });
    }
  }

  @Get('/web3/contract')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getWeb3Contract(@Res() res: Response) {
    try {

      const data = await this.depositService.getActiveAccount();

      delete data.private_key;

      return handleResponse(
        res,
        HttpStatus.OK,
        'web3 contract data fetched successfully',
        data && { ...data, abi: JSON.parse(data.abi), chain_details: JSON.parse(data.chain_details), usdt_abi: JSON.parse(data.usdt_abi) },
        [],
      );

    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error fetching company wallet data',
        error.message,
        [error.message],
      );
    }
  }
}
