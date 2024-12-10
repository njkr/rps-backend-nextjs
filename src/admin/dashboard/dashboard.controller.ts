import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
  Res,
  UsePipes,
  Query,
  Post,
  Inject,
  Param,
  Body,
  Patch,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GameService } from 'src/game/game.service';
import {
  getStartAndEndDateIsoFormat,
  handleResponse,
} from 'src/common/utils/util-functions.utility';
import { Response } from 'express';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { PlayerService } from 'src/player/player.service';
import { MarketplaceService } from 'src/marketplace/marketplace.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { DateFilterDto } from './dto/date-filter.dto';
import { WalletService } from 'src/wallet/wallet.service';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { REQUEST } from '@nestjs/core';
import { RolesEnum } from 'src/common/enum/admin.enum';
import { ApproveTransactionDto } from './dto/approve-transaction.dto';
import { DepositService } from 'src/deposit/deposit.service';
import { ethers } from 'ethers';
import {
  CreateWeb3ContractDto,
  UpdateWeb3ContractDto,
} from './dto/web3-contreact.dto';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly marketplaceService: MarketplaceService,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly depositService: DepositService,
  ) {}

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Get('/cards')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getAllCards(@Res() res: Response) {
    try {
      const totalGames =
        await this.gameService.getTodaysAndYesterdaysGameCount();

      const totalUsers =
        await this.playerService.getTodaysAndYesterdaysPlayersCount();

      const totalProducts =
        await this.marketplaceService.getTodaysAndYesterdaysMarketplaceCount();

      const totalTransaction =
        await this.transactionService.getTodayAndYesterdayTransaction();

      return handleResponse(
        res,
        HttpStatus.OK,
        'get card data fetched successfully',
        { totalGames, totalUsers, totalProducts, ...totalTransaction },
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'error fetching card data',
        error.message,
        [error.message],
      );
    }
  }

  @Get('/games')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getGames(@Query() dateFilterDto: DateFilterDto, @Res() res: Response) {
    try {
      const { startDateIsoFormat, endDateIsoFormat } =
        getStartAndEndDateIsoFormat(
          dateFilterDto.startDate,
          dateFilterDto.endDate,
        );

      const data = await this.gameService.getGamesByTimeFrame({
        startDate: startDateIsoFormat,
        endDate: endDateIsoFormat,
      });

      return handleResponse(
        res,
        HttpStatus.OK,
        'games data fetched successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error fetching games data',
        error.message,
        [error.message],
      );
    }
  }

  @Get('/transaction')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getTransaction(
    @Query() dateFilterDto: DateFilterDto,
    @Res() res: Response,
  ) {
    try {
      const { startDateIsoFormat, endDateIsoFormat } =
        getStartAndEndDateIsoFormat(
          dateFilterDto.startDate,
          dateFilterDto.endDate,
        );

      const data = await this.transactionService.getTransactionByTimeFrame({
        startDate: startDateIsoFormat,
        endDate: endDateIsoFormat,
      });

      return handleResponse(
        res,
        HttpStatus.OK,
        'transaction data fetched successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error fetching transaction data',
        error.message,
        [error.message],
      );
    }
  }

  @Get('/user/transaction/:status')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getUserPendingTransaction(
    @Param('status') status: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.transactionService.getTransactionsByTypeAndStatus(
        'Withdraw',
        status,
      );

      return handleResponse(
        res,
        HttpStatus.OK,
        'transaction pending data fetched successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error fetching transaction pending data',
        error.message,
        [error.message],
      );
    }
  }

  @Post('/user/transaction/approve')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async approvePendingTransaction(
    @Body() approveTransactionDto: ApproveTransactionDto,
    @Res() res: Response,
  ) {
    try {
      const { role } = this.getUserDetails();

      if (role !== RolesEnum.SUPER_ADMIN) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          "you den't have permission",
          [],
          [],
        );
      }

      const transactionData = await this.transactionService.getTransactionById(
        { user_id: approveTransactionDto.user_id },
        approveTransactionDto.tx_id,
      );

      if (
        !transactionData ||
        transactionData.tx_status !== 'Pending' ||
        transactionData.tx_type !== 'Withdraw'
      ) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'transaction not found',
          [],
          [],
        );
      }

      const amountInWei = ethers.utils.parseUnits(
        transactionData.amount.toString(),
        18,
      );
      this.depositService.withdraw(
        amountInWei,
        transactionData.wallet_address,
        transactionData.tx_id,
      );

      return handleResponse(
        res,
        HttpStatus.OK,
        'transaction approved successfully',
        [],
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error approving transaction',
        error.message,
        [error.message],
      );
    }
  }

  @Get('/company-wallet')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getCompanyWallet(@Res() res: Response) {
    try {
      const [companyWallet] =
        await this.walletService.getWalletsByType('Company');

      return handleResponse(
        res,
        HttpStatus.OK,
        'company wallet data fetched successfully',
        companyWallet,
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

  @Get('/web3/contract')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getWeb3Contract(@Res() res: Response) {
    try {
      const data = await this.depositService.getAllAccount();

      return handleResponse(
        res,
        HttpStatus.OK,
        'web3 contract data fetched successfully',
        data.map((item) => ({ ...item, abi: JSON.parse(item.abi) })),
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

  @Post('/web3/contract')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async CreateWeb3Contract(
    @Body() createWeb3ContractDto: CreateWeb3ContractDto,
    @Res() res: Response,
  ) {
    try {
      const { user_id, role } = this.getUserDetails();

      if (role !== RolesEnum.SUPER_ADMIN) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          "you den't have permission",
          [],
          [],
        );
      }

      await this.depositService.insertAccount({
        ...createWeb3ContractDto,
        user_id,
      });

      return handleResponse(
        res,
        HttpStatus.OK,
        'web3 contract created successfully',
        [],
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error web3 contract created successfully',
        error.message,
        [error.message],
      );
    }
  }

  @Patch('/web3/contract')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async updateWeb3Contract(
    @Body() updateWeb3ContractDto: UpdateWeb3ContractDto,
    @Res() res: Response,
  ) {
    try {
      const { user_id, role } = this.getUserDetails();

      if (role !== RolesEnum.SUPER_ADMIN) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          "you den't have permission",
          [],
          [],
        );
      }

      await this.depositService.validateAndUpdate({
        ...updateWeb3ContractDto,
        user_id,
      });

      return handleResponse(
        res,
        HttpStatus.OK,
        'web3 contract updated successfully',
        [],
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error web3 contract updated successfully',
        error.message,
        [error.message],
      );
    }
  }
}
