/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, Delete, Get, HttpStatus, Inject, Param, Post, Put, Query, Res, UseGuards, UsePipes } from '@nestjs/common';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { JackpotService } from './jackpot.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { JackpotLookupService } from './jackpot-lookup.service';
import { UpdateJackpotLookupDto } from './dto/update-jackpot-lookup.dto';
import { CreateJackpotLookupDto } from './dto/create-jackpot-lookup.dto';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { Response } from 'express';
import { TicketService } from 'src/ticket/ticket.service';
import { JackpotWinnerType, Status } from 'src/ticket/dto/update-insert-ticket.dto';
import { addDaysToDate, feesCalculate, handleResponse, percentageCalculate } from 'src/common/utils/util-functions.utility';
import { REQUEST } from '@nestjs/core';
import { IUser, UserRequest } from 'src/common/interfaces/user-request.interface';
import { CurrencyRatesService } from 'src/currency-rates/currency-rates.service';
import { ClaimJackpotDto } from './dto/claim-jackpot.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { WalletService } from 'src/wallet/wallet.service';

@Controller('jackpot')
export class JackpotController {
  constructor(
    private readonly jackpotService: JackpotService,
    private readonly jackpotLookupService: JackpotLookupService,
    private readonly dynamoService: DynamoService,
    private readonly ticketService: TicketService,
    private readonly currencyRatesService: CurrencyRatesService,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
    @Inject(REQUEST) private readonly request: UserRequest,
  ) { }

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Get('all')
  async getAllJackpots(@Res() res: Response): Promise<any> {
    try {

      const activeJackpot = await this.jackpotService.getActiveJackpotsByStatus("Closed", 1);
      const expiredJackpot = await this.jackpotService.getActiveJackpotsByStatus("Expired", 5);

      // Use map and Promise.all to wait for all winners to be fetched
      const updatedExpiredJackpots = await Promise.all(expiredJackpot.map(async (jackpot: any) => {
        const [winner] = await this.ticketService.getTicketsWinnerType(jackpot.id, ['first']);
        jackpot.winner = winner;
        return jackpot;
      }));

      return handleResponse(
        res,
        HttpStatus.OK,
        'All jackpots fetched successfully',
        [...activeJackpot, ...updatedExpiredJackpots],
        []
      );


    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Jackpots', [], [error.message]);

    }
  }

  @Get()
  async getJackpotsByStatus(
    @Query('jackpotStatus') jackpotStatus: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.jackpotService.getJackpotsByStatus(jackpotStatus);

      return handleResponse(res, HttpStatus.OK, 'all Jackpots fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Jackpots', [], [error.message]);

    }
  }

  @Get("active")
  async getActiveJackpots(
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.jackpotService.getActiveJackpots();

      const responseData = data ? { ...data, remaining_tickets: data.no_to_open - data.total_of_tickets, completed_percentage: (data.total_of_tickets / data.no_to_open) * 100 } : [];

      return handleResponse(res, HttpStatus.OK, 'active Jackpot fetched successfully', responseData, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Jackpots', [], [error.message]);

    }
  }

  private readonly generateJackpotWinnerData = async (jackpotData): Promise<any> => {

    const JackpotLookupData = await this.jackpotLookupService.getLookupRecordByPlace(JackpotWinnerType.GUARANTEED);

    const ticketData = await this.ticketService.getTicketsByJackpotStatus(jackpotData.id, [Status.VALID]);

    return this.jackpotService.generateJackpotWinnerData(ticketData, JackpotLookupData);

  }

  @Get("active/winners")
  async getActiveJackpotWinners(
    @Res() res: Response,
  ): Promise<any> {
    try {

      const jackpotData = await this.jackpotService.getActiveJackpots();

      if (!jackpotData) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'no active Jackpots found', [], []);

      }

      const allJackpotResponse = await this.generateJackpotWinnerData(jackpotData);

      return handleResponse(res, HttpStatus.OK, 'active Jackpot fetched successfully', allJackpotResponse, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Jackpots', [], [error.message]);

    }
  }

  @Get("active/winners/user")
  @UseGuards(JwtAuthGuard)
  async getUserActiveJackpotWinners(
    @Res() res: Response,
  ): Promise<any> {
    try {

      const { user_id } = this.getUserDetails();

      const jackpotData = await this.jackpotService.getActiveJackpots();

      if (!jackpotData) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'no active Jackpots found', [], []);

      }

      const allJackpotResponse = await this.generateJackpotWinnerData(jackpotData);

      const [ticketData] = await this.ticketService.getUserTicketsByJackpotStatus(user_id, jackpotData.id, Status.VALID);

      const [currentUserJackpot] = allJackpotResponse.filter((item) => item.user_id === user_id);

      const userJackpot: any = {};

      const lowestJackpotRank = allJackpotResponse.length === 0 ? null : allJackpotResponse[allJackpotResponse.length - 1];

      userJackpot.guaranteed_jackpot_amount = lowestJackpotRank?.jackpot_win_amount || percentageCalculate(jackpotData.amount, 20);

      userJackpot.ticket_needed = 0;
      userJackpot.amount = ticketData?.amount || 0;
      userJackpot.jackpot_rank = 0;

      if (!currentUserJackpot) {

        userJackpot.ticket_needed = lowestJackpotRank?.amount + 1 || 1;

      }

      if (currentUserJackpot) {

        userJackpot.amount = currentUserJackpot.amount;
        userJackpot.jackpot_rank = currentUserJackpot.jackpot_rank;

      }

      return handleResponse(res, HttpStatus.OK, 'active Jackpot fetched successfully', { userJackpot, allJackpot: allJackpotResponse }, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Jackpots', [], [error.message]);

    }
  }

  private async getJackpotWinners(id: string, @Res() res): Promise<any> {
    const jackpotLookupData = await this.jackpotLookupService.getAllJackpotRecords();

    if (!jackpotLookupData) {

      return handleResponse(res, HttpStatus.NOT_FOUND, 'no lookup data found', [], []);

    }

    const data = {}

    for (const entry of jackpotLookupData) {

      data[entry.place] = await this.ticketService.getTicketsWinnerType(id, [entry.place]);

    }
    return data;
  }

  @Get("history/winners/:id")
  async getJackpotWinnersHistory(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {


      const data = await this.getJackpotWinners(id, res);

      return handleResponse(res, HttpStatus.OK, 'active Jackpot fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Jackpots', [], [error.message]);

    }
  }

  @Get("history/winners/user/:id")
  @UseGuards(JwtAuthGuard)
  async getJackpotWinnersUserHistory(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {

      const { user_id } = this.getUserDetails();

      const data = await this.getJackpotWinners(id, res);

      const userJackpot = await this.ticketService.getTicketsByJackpotStatus(id, [], user_id);

      return handleResponse(res, HttpStatus.OK, 'user active Jackpot fetched successfully', { ...data, userJackpot }, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all user Jackpots', [], [error.message]);

    }
  }

  @Get("available")
  @UseGuards(JwtAuthGuard)
  async getUserAvailableJackpot(
    @Res() res: Response,
  ): Promise<any> {
    try {

      const { user_id } = this.getUserDetails();

      let ticketData = await this.ticketService.getUserTicketsByStatusWinType(user_id, Status.PENDING, null);

      const [currencyData] = await this.currencyRatesService.getByCurrency("USD");

      if (!currencyData) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'Currency rate not found', [], []);

      }

      ticketData = ticketData.map((ticket) => ({
        ...ticket,
        expiry_date: addDaysToDate(ticket.date, 60),
        gas_fees: feesCalculate(percentageCalculate(ticket.jackpot_claimable_win_amount, 80), currencyData.fees_percentage, currencyData.rate),
      }));

      return handleResponse(res, HttpStatus.OK, 'available Jackpot fetched successfully', ticketData, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving all Jackpots', [], [error.message]);

    }
  }

  @Post("claim")
  @UseGuards(JwtAuthGuard)
  async claimAvailableJackpot(
    @Body() claimJackpotDto: ClaimJackpotDto,
    @Res() res: Response,
  ): Promise<any> {
    try {

      const { user_id } = this.getUserDetails();

      const ticketData = await this.ticketService.getTicketById({
        ticket_id: claimJackpotDto.ticket_id,
        user_id
      });

      if (!ticketData || ticketData.status !== Status.PENDING || ticketData.jackpot_winner_type === null || ticketData.jackpot_win_amount === null) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'there are no available Jackpots', [], []);

      }

      const [currencyData] = await this.currencyRatesService.getByCurrency("USD");

      if (!currencyData) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'Currency rate not found', [], []);

      }

      const [companyWallet] = await this.walletService.getWalletsByType('Company');

      if (!companyWallet) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Company wallet not found',
          [],
          ['Company wallet not found'],
        );
      }


      if (ticketData.is_free_claimed) {

        const gas_fees = feesCalculate(ticketData.jackpot_claimable_win_amount, currencyData.fees_percentage, currencyData.rate);


        await this.transactionService.validateAndCreateTransaction({
          user_id
        }, {
          amount: gas_fees,
          tx_operation: "Remove",
          tx_type: "Jackpot Gas Fee",
          source_type: "Jackpot",
          source_id: claimJackpotDto.ticket_id,
          coin_type: "LC",
          user_id,
          remarks: "gas fees for claiming Jackpot by user"
        })


        await this.transactionService.validateAndCreateTransaction(
          { user_id: companyWallet.user_id },
          {
            user_id: companyWallet.user_id,
            tx_type: 'Jackpot Gas Fee',
            tx_operation: 'Add',
            coin_type: 'LC',
            source_type: "Jackpot",
            source_id: claimJackpotDto.ticket_id,
            amount: gas_fees,
            remarks: `Jackpot Gas Fee added for ticket ${claimJackpotDto.ticket_id}`,
          },
        );

      }


      await this.transactionService.validateAndCreateTransaction({
        user_id
      }, {
        amount: ticketData.is_free_claimed ? ticketData.jackpot_claimable_win_amount : ticketData.jackpot_free_claimable_win_amount,
        tx_operation: "Add",
        tx_type: ticketData.is_free_claimed ? "Jackpot Won" : "Jackpot Free Won",
        coin_type: "Dollar",
        source_type: "Jackpot",
        source_id: claimJackpotDto.ticket_id,
        user_id,
        remarks: `Jackpot ${ticketData.is_free_claimed ? "Win" : "Free Win"} claimed by user`
      })

      delete ticketData.ticket_id;
      delete ticketData.user_id;

      await this.ticketService.updateTicket(
        {
          ticket_id: claimJackpotDto.ticket_id,
          user_id
        },
        {
          ...ticketData,
          ...(ticketData.is_free_claimed ? { status: Status.CLAIMED, jackpot_claim_date: new Date().toISOString() } : { is_free_claimed: true, jackpot_free_claim_date: new Date().toISOString() }),
        }
      );

      return handleResponse(res, HttpStatus.OK, 'Jackpot claimed successfully', [], []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error claiming Jackpot', [], [error.message]);

    }
  }


  @Get(':id')
  async getJackpotRow(@Param('id') id: string, @Res() res: Response) {
    try {
      const data = await this.jackpotService.getJackpotById(id);
      if (!data) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'record not found', [], ['record not found']);

      }

      return handleResponse(res, HttpStatus.OK, 'Jackpot retrieved successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving Jackpot', [], [error.message]);

    }
  }


  // ============= jackpot-lookup ==================
  @Get('/jackpot-lookup/all')
  async getAllLookupRecords(@Res() res: Response): Promise<any> {
    try {
      const data = await this.jackpotLookupService.getAllJackpotRecords();

      return handleResponse(res, HttpStatus.OK, 'jackpot lookup records fetched successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving jackpot lookup Records', [], [error.message]);

    }
  }

  @Post('/jackpot-lookup')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async addLookupRow(
    @Body() createJackpotLookupDto: CreateJackpotLookupDto,
    @Res() res: Response,
  ) {
    try {

      const lookupData = await this.jackpotLookupService.getLookupRecordByPlace(createJackpotLookupDto.place);
      if (lookupData) {

        return handleResponse(res, HttpStatus.CONFLICT, 'record already exists please update', [], ['record already exists']);

      }

      this.jackpotLookupService.createLookupRecord(
        createJackpotLookupDto,
      );

      return handleResponse(res, HttpStatus.CREATED, 'Record created successfully', [], []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error creating record', [], [error.message]);

    }
  }

  @Get('/jackpot-lookup/:id')
  @UseGuards(JwtAuthGuard)
  async getLookupRow(@Param('id') id: string, @Res() res: Response) {
    try {
      const data = await this.jackpotLookupService.getLookupRecordById(id);
      if (!data) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'record not found', [], ['record not found']);

      }

      return handleResponse(res, HttpStatus.OK, 'jackpot lookup record retrieved successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving jackpot lookup Record', [], [error.message]);

    }
  }

  @Get('/jackpot-lookup/place/:place')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getLookupRowRange(
    @Param('place') place: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.jackpotLookupService.getLookupRecordByPlace(place);
      if (!data) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'record not found', [], ['record not found']);

      }

      return handleResponse(res, HttpStatus.OK, 'jackpot lookup record retrieved successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error retrieving jackpot lookup Record', [], [error.message]);

    }
  }

  @Put('/jackpot-lookup')
  @UseGuards(JwtAuthGuard)
  async updateJackpotLookupRecord(
    @Body() updateJackpotLookupDto: UpdateJackpotLookupDto,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const data = await this.jackpotLookupService.updateLookupRecord(
        updateJackpotLookupDto,
      );

      return handleResponse(res, HttpStatus.OK, 'jackpot lookup record updated successfully', data, []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error updating jackpot lookup Record', [], [error.message]);

    }
  }

  @Delete('/jackpot-lookup/:id')
  @UseGuards(JwtAuthGuard)
  async deleteLookupRowById(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // check id exist
      const isIDExists = await this.dynamoService.isIdExist(
        id,
        this.jackpotLookupService.getTablePK(),
        this.jackpotLookupService.getTableName(),
      );
      if (!isIDExists) {

        return handleResponse(res, HttpStatus.NOT_FOUND, 'record not found', [], ['record not found']);

      }
      // delete data
      await this.jackpotLookupService.deleteLookupRecordById(id);

      return handleResponse(res, HttpStatus.OK, 'jackpot lookup record deleted successfully', [], []);

    } catch (error) {

      return handleResponse(res, HttpStatus.INTERNAL_SERVER_ERROR, 'Error deleting jackpot lookup Record', [], [error.message]);

    }
  }
}
