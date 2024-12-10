import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UsePipes,
  Inject,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { GameRoundService } from './game-round.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { REQUEST } from '@nestjs/core';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { UpdateInsertGameRoundDto } from './dto/update-insert-game-round.dto';
import { GameService } from 'src/game/game.service';
import { Response } from 'express';
import { EndGameRoundDto } from './dto/end-game-round.dto';
import {
  getQueueResponse,
  handleResponse,
} from 'src/common/utils/util-functions.utility';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Controller('game-round')
@UseGuards(JwtAuthGuard)
@UsePipes(new RequestValidationPipe({ transform: true }))
export class GameRoundController {
  constructor(
    private readonly gameRoundService: GameRoundService,
    @Inject(REQUEST) private readonly request: UserRequest,
    private readonly gameService: GameService,
    @InjectQueue('game') private readonly gameQueue: Queue,
  ) {}

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Get('/all/:game_id')
  async getAllGameRound(
    @Param('game_id') game_id: string,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();
      const gameData = await this.gameService.getGamesByUser({
        game_id,
        user_id,
      });

      if (!gameData) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Game data not found',
          [],
          ['Game data not found'],
        );
      }

      const data = await this.gameRoundService.getAllGameRound({
        game_id,
      });

      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Game rounds not found',
          [],
          ['Game rounds not found'],
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'Game rounds retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Game rounds',
        [],
        [error.message],
      );
    }
  }

  @Get(':round_id')
  async getGameRoundsById(
    @Param('round_id') round_id: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.gameRoundService.getGameRoundsById({
        round_id,
      });

      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'game round not found',
          [],
          ['game round not found'],
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'game round retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving game round Records',
        error.message,
        [error.message],
      );
    }
  }

  @Post()
  async createGameRound(
    @Body() updateInsertGameRoundDto: UpdateInsertGameRoundDto,
    @Res() res: Response,
  ) {
    try {
      const queueResponse = await this.gameQueue.add(
        'gameRound',
        {
          data: updateInsertGameRoundDto,
          id: updateInsertGameRoundDto.game_id,
        },
        {
          attempts: 0,
          deduplication: {
            id: updateInsertGameRoundDto.game_id,
          },
        },
      );

      const { statusCode, message, data, errors } = await getQueueResponse(
        queueResponse,
        updateInsertGameRoundDto.game_id,
      );

      return handleResponse(res, statusCode, message, data, errors);
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error creating game round Records',
        error.message,
        [error.message],
      );
    }
  }

  @Post('end')
  async endGameRound(
    @Body() endGameRoundDto: EndGameRoundDto,
    @Res() res: Response,
  ) {
    try {
      // add some general token
      const queueResponse = await this.gameQueue.add(
        'gameEnd',
        {
          data: endGameRoundDto,
          id: endGameRoundDto.game_id,
        },
        {
          attempts: 0,
          deduplication: {
            id: endGameRoundDto.game_id,
          },
        },
      );

      const { statusCode, message, data, errors } = await getQueueResponse(
        queueResponse,
        endGameRoundDto.game_id,
      );

      return handleResponse(res, statusCode, message, data, errors);
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error creating game round Records',
        error.message,
        [error.message],
      );
    }
  }
}
