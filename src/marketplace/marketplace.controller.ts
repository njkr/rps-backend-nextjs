/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Body, Controller, Delete, Get, HttpStatus, Inject, Param, Patch, Post, Query, Res, UseGuards, UsePipes } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CognitoService } from 'src/auth/cognito.service';
import { GetOfferByStatusDto } from './dto/get-offer-by-status.dto';
import { GetOfferByTypeDto } from './dto/get-offer-by-type.dto';
import { Response } from 'express';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { GetOfferByPriceTypeStatusDto } from './dto/get-offer-price-status-type.dto';
import { PurchaseOfferDto } from './dto/purchase-offer.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { WalletService } from 'src/wallet/wallet.service';
import { getQueueResponse, handleResponse } from 'src/common/utils/util-functions.utility';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IUser, UserRequest } from 'src/common/interfaces/user-request.interface';
import { REQUEST } from '@nestjs/core';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly cognitoService: CognitoService,
    private readonly dynamoService: DynamoService,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
    @Inject(REQUEST) private readonly request: UserRequest,
    @InjectQueue('marketplace') private readonly marketplaceQueue: Queue,
  ) { }

  public getUserDetails(): IUser {
    return this.request.user;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async addOffer(@Body() createOfferDto: CreateOfferDto, @Res() res: Response) {
    try {
      // Get authenticated user details from the request
      const authUser = this.getUserDetails();

      const queueResponse = await this.marketplaceQueue.add('createOffer', {
        authUser,
        offerData: createOfferDto,
        id: authUser.user_id
      }, {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 0,
        deduplication: {
          id: authUser.user_id
        }
      });

      await getQueueResponse(queueResponse, authUser.user_id);

      // Delegate the logic to the service layer

      return handleResponse(res, HttpStatus.CREATED, 'Offer created successfully', [], []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error adding to offer', [], [error.message]);

    }
  }

  // @Get('all')
  // @UseGuards(JwtAuthGuard)
  // async getAllOffers(@Res() res: Response): Promise<any> {
  //   try {
  //     const data = await this.marketplaceService.getAllOffers();
  //     return res.status(HttpStatus.OK).json({
  //       statusCode: HttpStatus.OK,
  //       message: 'all Offers fetched successfully',
  //       data: data,
  //       errors: [],
  //     });
  //   } catch (error) {
  //     return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  //       message: 'Error retrieving all Offers',
  //       errors: [error.message],
  //       data: [],
  //     });
  //   }
  // }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllOffersByPriceStatusType(
    @Query() GetOfferByPriceTypeStatusDto: GetOfferByPriceTypeStatusDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.marketplaceService.getAllOffersByPriceStatusType(GetOfferByPriceTypeStatusDto);

      return handleResponse(res, HttpStatus.OK, 'all Offers fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Offers', [], [error.message]);

    }
  }

  @Get('all/status')
  @UseGuards(JwtAuthGuard)
  async getAllOffersByStatus(
    @Query() getOfferByStatusDto: GetOfferByStatusDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.marketplaceService.getOffersByStatus(
        getOfferByStatusDto.offerStatus,
      );

      return handleResponse(res, HttpStatus.OK, 'all Offers fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Offers', [], [error.message]);

    }
  }

  @Get('all/type')
  @UseGuards(JwtAuthGuard)
  async getAllOffersByType(
    @Query() getOfferByTypeDto: GetOfferByTypeDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.marketplaceService.getOffersByType(
        getOfferByTypeDto.offerType,
      );

      return handleResponse(res, HttpStatus.OK, 'all Offers fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Offers', [], [error.message]);

    }
  }

  @Get('user-offers')
  @UseGuards(JwtAuthGuard)
  async getAllUserOffers(@Res() res: Response): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();
      // get data
      const data = await this.marketplaceService.getUserOffers(authUser);

      return handleResponse(res, HttpStatus.OK, 'all user Offers fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user Offers', [], [error.message]);

    }
  }

  @Get('user-offers/status')
  @UseGuards(JwtAuthGuard)
  async getAllUserOffersByStatus(
    @Query() getOfferByStatusDto: GetOfferByStatusDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // get data
      const data = await this.marketplaceService.getUserOffersByStatus(
        getOfferByStatusDto.offerStatus,
        authUser,
      );

      return handleResponse(res, HttpStatus.OK, 'all user Offers fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user Offers', [], [error.message]);

    }
  }

  @Get('user-offers/type')
  @UseGuards(JwtAuthGuard)
  async getAllUserOffersByType(
    @Query() getOfferByTypeDto: GetOfferByTypeDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      const data = await this.marketplaceService.getUserOffersByType(
        getOfferByTypeDto.offerType,
        authUser,
      );

      return handleResponse(res, HttpStatus.OK, 'all user Offers fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user Offers', [], [error.message]);

    }
  }

  @Get(':offer_id')
  @UseGuards(JwtAuthGuard)
  async getOfferById(
    @Param('offer_id') offer_id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      // check id exist
      const isIDExists = await this.dynamoService.isSubIdExist(
        authUser.user_id,
        this.marketplaceService.getTablePK(),
        offer_id,
        this.marketplaceService.getTableSK(),
        this.marketplaceService.getTableName(),
      );
      if (!isIDExists) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'offer not found', [], ['offer not found']);

      }
      // get data
      const data = await this.marketplaceService.getOfferById(
        authUser,
        offer_id,
      );

      return handleResponse(res, HttpStatus.OK, 'offer fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving offer', [], [error.message]);

    }
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async purchaseOffer(
    @Body() purchaseOfferDto: PurchaseOfferDto,
    @Res() res: Response,
  ) {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      const { offer_id } = purchaseOfferDto;

      const [offerDetails] = await this.marketplaceService.getOfferOfferId(
        offer_id,
      );

      if (!offerDetails) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'offer not found', [], ['offer not found']);

      }

      if (offerDetails.status !== "Open") {

        return handleResponse(res, HttpStatus.BAD_REQUEST, 'offer is not open status', [], ['offer is not open status']);

      }

      const [companyWallet] = await this.walletService.getWalletsByType('Company');

      if (!companyWallet) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'company wallet not found', [], ['company wallet not found']);

      }

      const [transactionData] = await this.transactionService.getTransactionsSourceId(
        {
          source_id: offerDetails.offer_id,
          source_type: "Marketplace"
        }
      );

      if (!transactionData) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'transaction not found', [], ['transaction not found']);

      }

      const queueResponse = await this.marketplaceQueue.add('purchaseOffer', {
        offerData: { authUser, offerDetails, transactionData, companyWallet },
        id: authUser.user_id
      }, {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 0,
        deduplication: {
          id: offer_id
        }
      });

      const data = await getQueueResponse(queueResponse, authUser.user_id);

      return handleResponse(res, HttpStatus.OK, 'offer purchased successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error purchased Offer', [], [error.message]);

    }
  }

  @Delete(':offer_id')
  @UseGuards(JwtAuthGuard)
  async deleteOfferById(
    @Param('offer_id') offer_id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // get user from request
      const authUser = this.getUserDetails();

      const offerDetails = await this.marketplaceService.getOfferById(
        authUser,
        offer_id,
      );

      if (!offerDetails) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'offer not found', [], ['offer not found']);

      }

      if (offerDetails.status !== "Open") {

        return handleResponse(res, HttpStatus.BAD_REQUEST, 'offer is not open status', [], ['offer is not open status']);

      }

      const [transactionData] = await this.transactionService.getTransactionsSourceId(
        {
          source_id: offerDetails.offer_id,
          source_type: "Marketplace"
        }
      );

      if (!transactionData) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'transaction not found', [], ['transaction not found']);

      }

      const queueResponse = await this.marketplaceQueue.add('deleteOffer', {
        offerData: { transactionData, offerDetails },
        id: authUser.user_id
      }, {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 0,
        deduplication: {
          id: offer_id
        }
      });

      await getQueueResponse(queueResponse, authUser.user_id);

      return handleResponse(res, HttpStatus.OK, 'offer deleted successfully', [], []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error deleting Offer', [], [error.message]);

    }
  }
}
