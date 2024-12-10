import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  UseGuards,
  HttpStatus,
  Query,
  Res,
  UsePipes,
} from '@nestjs/common';
import { LcService } from './lc.service';
import { DynamoService } from 'src/dynamo/dynamo.service';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { REQUEST } from '@nestjs/core';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateInsertLcDto } from './dto/update-insert-lc.dto';
import { Response } from 'express';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { handleResponse } from 'src/common/utils/util-functions.utility';

@Controller('lc')
@UseGuards(JwtAuthGuard)
@UsePipes(new RequestValidationPipe({ transform: true }))
export class LcController {
  constructor(
    private readonly playerLcService: LcService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly dynamoService: DynamoService,
  ) {}

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Get('/all')
  async getAllLcById(
    @Query('lastEvaluatedKey') lastEvaluatedKey: string | undefined,
    @Query('limit') limit: number,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();
      const data = await this.playerLcService.getAllLcById({
        lastEvaluatedKey,
        limit: limit || 5,
        user_id,
      });

      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'LC not found',
          [],
          ['LC not found'],
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'LC retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving LC',
        [],
        ['Error retrieving LC'],
      );
    }
  }

  @Get(':lc_id')
  async getLcById(@Param('lc_id') lc_id: string, @Res() res: Response) {
    try {
      const { user_id } = this.getUserDetails();
      const data = await this.playerLcService.getLcById({
        lc_id,
        user_id,
      });

      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'LC not found',
          [],
          ['LC not found'],
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'LC retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving LC',
        [],
        ['Error retrieving LC'],
      );
    }
  }

  @Post()
  async createLc(
    @Body() updateInsertLcDto: UpdateInsertLcDto,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();
      const lc_id = await this.playerLcService.generateUniqueId(user_id);
      await this.playerLcService.createLc(
        {
          lc_id,
          user_id,
        },
        updateInsertLcDto,
      );

      return handleResponse(
        res,
        HttpStatus.CREATED,
        'Player LC created successfully',
        [],
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error creating player LC records',
        error.message,
        [error.message],
      );
    }
  }

  @Patch(':lc_id')
  async updateLc(
    @Param('lc_id') lc_id: string,
    @Body() updateInsertLcDto: UpdateInsertLcDto,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();

      const isIDExists = await this.dynamoService.isSubIdExist(
        user_id,
        this.playerLcService.getTablePK(),
        lc_id,
        this.playerLcService.getTableSK(),
        this.playerLcService.getTableName(),
      );

      if (!isIDExists) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'LC not found',
          [],
          ['LC not found'],
        );
      }

      const data = await this.playerLcService.updateLc(
        { lc_id, user_id },
        updateInsertLcDto,
      );

      return handleResponse(
        res,
        HttpStatus.OK,
        'LC updated successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error updating player LC records',
        error.message,
        [error.message],
      );
    }
  }

  @Delete(':lc_id')
  async deleteLc(@Param('lc_id') lc_id: string, @Res() res: Response) {
    try {
      const { user_id } = this.getUserDetails();

      const isIDExists = await this.dynamoService.isSubIdExist(
        user_id,
        this.playerLcService.getTablePK(),
        lc_id,
        this.playerLcService.getTableSK(),
        this.playerLcService.getTableName(),
      );

      if (!isIDExists) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'LC not found',
          [],
          ['LC not found'],
        );
      }

      await this.playerLcService.deleteLc({
        lc_id,
        user_id,
      });

      return handleResponse(
        res,
        HttpStatus.OK,
        'LC deleted successfully',
        {},
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error deleting LC',
        error.message,
        [error.message],
      );
    }
  }
}
