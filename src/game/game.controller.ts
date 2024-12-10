import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Inject,
  UseGuards,
  HttpStatus,
  Query,
  UsePipes,
  Res,
} from '@nestjs/common';
import { GameService } from './game.service';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { Response } from 'express';
import { REQUEST } from '@nestjs/core';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GameStatus } from './dto/insert-game.dto';
import { RequestValidationPipe } from 'src/common/pipes/request-validation.pipe';
import { InsertGameApiDto } from './dto/insert-game-api.dto';
import {
  getQueueResponse,
  handleResponse,
} from 'src/common/utils/util-functions.utility';
import { GamePlayerLeftDto } from './dto/game-player-left.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    @Inject(REQUEST) private readonly request: UserRequest,
    @InjectQueue('game') private readonly gameQueue: Queue,
  ) {}

  private getUserDetails(): IUser {
    return this.request.user;
  }

  @Get('/all')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getAllPlayerGames(
    @Query('lastEvaluatedKey') lastEvaluatedKey: string | undefined,
    @Query('limit') limit: number,
    @Res() res: Response,
  ) {
    try {
      const { user_id } = this.getUserDetails();
      const data = await this.gameService.getAllGames({
        lastEvaluatedKey,
        limit: limit ?? 5,
        user_id,
      });

      return handleResponse(
        res,
        HttpStatus.OK,
        'Games retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Games',
        [],
        [error.message],
      );
    }
  }

  @Get('/all/:user_id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getAllPlayerGamesByUserId(
    @Param('user_id') user_id: string,
    @Query('lastEvaluatedKey') lastEvaluatedKey: string | undefined,
    @Query('limit') limit: number,
    @Res() res: Response,
  ) {
    try {
      const data = await this.gameService.getAllGames({
        lastEvaluatedKey,
        limit: limit ?? 5,
        user_id,
      });

      return handleResponse(
        res,
        HttpStatus.OK,
        'Games retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Games',
        [],
        [error.message],
      );
    }
  }

  @Get('/active')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getActiveGames(@Res() res: Response) {
    try {
      const { user_id } = this.getUserDetails();
      const [data] = await this.gameService.getPlayerPlayingGame(user_id);

      return handleResponse(
        res,
        HttpStatus.OK,
        'Active games retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Active Games',
        [],
        [error.message],
      );
    }
  }

  @Get('/all/gameCount')
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getGamePlayingCount(@Res() res: Response) {
    try {
      const data = await this.gameService.getGameCountByStatus(
        GameStatus.Playing,
      );

      return handleResponse(
        res,
        HttpStatus.OK,
        'Games count retrieved successfully',
        {
          count: data * 2,
        },
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Games count',
        [],
        [error.message],
      );
    }
  }

  @Get(':game_id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async getPlayerGameById(
    @Param('game_id') game_id: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.gameService.getGameById({
        game_id,
      });

      if (!data) {
        return handleResponse(
          res,
          HttpStatus.NOT_FOUND,
          'Game not found',
          [],
          ['Game not found'],
        );
      }

      return handleResponse(
        res,
        HttpStatus.OK,
        'Game retrieved successfully',
        data,
        [],
      );
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error retrieving Game',
        [],
        [error.message],
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async createPlayerGame(
    @Body() insertGameApiDto: InsertGameApiDto,
    @Res() res: Response,
  ) {
    try {
      const { first_player, second_player } = insertGameApiDto;

      if (first_player === second_player) {
        return handleResponse(
          res,
          HttpStatus.BAD_REQUEST,
          'first_player and second_player cannot be same',
          [],
          ['first_player and second_player cannot be same'],
        );
      }

      const id = [first_player, second_player]
        .sort((a, b) => a.localeCompare(b))
        .join('-');

      const queueResponse = await this.gameQueue.add(
        'insertGame',
        {
          data: insertGameApiDto,
          id,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
          attempts: 0,
          deduplication: {
            id,
          },
        },
      );

      const { statusCode, message, data, errors } = await getQueueResponse(
        queueResponse,
        id,
      );

      return handleResponse(res, statusCode, message, data, errors);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error creating Game Records',
        errors: ['Error creating Game Records'],
        data: error.message,
      });
    }
  }

  @Post('player-left')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new RequestValidationPipe({ transform: true }))
  async updatePlayersGame(
    @Body() gamePlayerLeftDto: GamePlayerLeftDto,
    @Res() res: Response,
  ) {
    try {
      const queueResponse = await this.gameQueue.add(
        'playerLeft',
        {
          data: gamePlayerLeftDto,
          id: gamePlayerLeftDto.game_id,
        },
        {
          attempts: 0,
          deduplication: {
            id: gamePlayerLeftDto.game_id,
          },
        },
      );

      const { statusCode, message, data, errors } = await getQueueResponse(
        queueResponse,
        gamePlayerLeftDto.game_id,
      );

      return handleResponse(res, statusCode, message, data, errors);
    } catch (error) {
      return handleResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Error player left game',
        [],
        [error.message],
      );
    }
  }
}
