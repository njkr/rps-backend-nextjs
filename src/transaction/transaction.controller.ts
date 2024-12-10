/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, HttpStatus, Inject, Param, Query, Res, UseGuards, UsePipes } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { Response } from 'express';
import { GetTRansactionByTypeDto } from './dto/get-transaction-type.dto';
import { GetTransactionByOpDto } from './dto/get-transaction-op.dto';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { REQUEST } from '@nestjs/core';
import { IUser, UserRequest } from 'src/common/interfaces/user-request.interface';
import { handleResponse } from 'src/common/utils/util-functions.utility';

@Controller('transaction')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly dynamoService: DynamoService,
    @Inject(REQUEST) private readonly request: UserRequest,
  ) { }

  private getUserDetails(): IUser {
    return this.request.user;
  }

  private async checkIdExists(authUser: any, tx_id: string,
  ): Promise<any> {
    return await this.dynamoService.isSubIdExist(
      authUser.user_id,
      this.transactionService.getTablePK(),
      tx_id,
      this.transactionService.getTableSK(),
      this.transactionService.getTableName(),
    );
  }


  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllTransactions(@Res() res: Response): Promise<any> {
    try {
      const data = await this.transactionService.getAllTransactions();
      return handleResponse(res, HttpStatus.OK, 'all Transactions fetched successfully', data, []);
    } catch (error) {
      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Transactions', [], [error.message]);
    }
  }

  @Get('all/type')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getAllTransactionsByType(
    @Query() getOfferByStatusDto: GetTRansactionByTypeDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.transactionService.getTransactionsByType(
        getOfferByStatusDto.tx_type,
      );
      return handleResponse(res, HttpStatus.OK, 'all transactions fetched successfully', data, []);
    } catch (error) {
      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all transactions', [], [error.message]);
    }
  }

  @Get('all/operation')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getAllTRansactionsByOp(
    @Query() getOfferByTypeDto: GetTransactionByOpDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.transactionService.getTransactionsByOperation(
        getOfferByTypeDto.tx_operation,
      );

      return handleResponse(res, HttpStatus.OK, 'all transactions fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all transactions', [], [error.message]);

    }
  }

  @Get('user-transactions')
  @UseGuards(JwtAuthGuard)
  async getAllUserOffers(@Res() res: Response): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();
      // get data
      const data = await this.transactionService.getUserTransactions(authUser);

      return handleResponse(res, HttpStatus.OK, 'all user transactions fetched successfully', data.slice(0, 50), []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user transactions', [], [error.message]);

    }
  }

  @Get('user-transactions/type')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getAllUserTransByType(
    @Query() getOfferByStatusDto: GetTRansactionByTypeDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // get data
      const data = await this.transactionService.getUserTransactionByType(
        getOfferByStatusDto.tx_type,
        authUser,
      );

      return handleResponse(res, HttpStatus.OK, 'all user transactions fetched successfully', data.slice(0, 50), []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user transactions', [], [error.message]);

    }
  }

  @Get('user-transactions/operation')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getAllUserTransByOp(
    @Query() getOfferByTypeDto: GetTransactionByOpDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      const data = await this.transactionService.getUserTransactionByOperation(
        getOfferByTypeDto.tx_operation,
        authUser,
      );

      return handleResponse(res, HttpStatus.OK, 'all user transactions fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user transactions', [], [error.message]);

    }
  }

  @Get(':tx_id')
  @UseGuards(JwtAuthGuard)
  async getTRansactionById(
    @Param('tx_id') tx_id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // check id exist
      const isIDExists = await this.checkIdExists(
        authUser,
        tx_id,
      )

      if (!isIDExists) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'transaction not found', [], ['transaction not found']);

      }
      // get data
      const data = await this.transactionService.getTransactionById(
        authUser,
        tx_id,
      );

      return handleResponse(res, HttpStatus.OK, 'transaction fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving transaction', [], [error.message]);

    }
  }

}
