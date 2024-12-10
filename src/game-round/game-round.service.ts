/* eslint-disable prettier/prettier */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  DynamoDBClient
} from '@aws-sdk/client-dynamodb';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { GetAllGameRoundByGameDto } from './dto/get-all-game-round-by-game.dto';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { GameRoundDto } from './dto/game-round.dto';
import { UpdateInsertGameRoundDto } from './dto/update-insert-game-round.dto';
import { v4 as uuidv4 } from 'uuid';
import { GetGameByRoundDto } from './dto/get-game-by-round.dto';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';
import { GameService } from 'src/game/game.service';
import { GameStatus, SourceType } from 'src/game/dto/insert-game.dto';
import { EndGameRoundDto } from './dto/end-game-round.dto';

@Injectable()
export class GameRoundService {
  private readonly logger = new Logger(GameRoundService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;
  private readonly coinTossOp = ['CoinTossWin', 'CoinTossLose'];

  constructor(private readonly dynamoService: DynamoService,
    private readonly gameService: GameService,
  ) {
    this.tableName = DynamoTables.GameRounds;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'round_id';
  }

  async getGameRoundsById(gameRoundDto: GameRoundDto): Promise<any> {
    try {
      const { round_id } = gameRoundDto;
      const params = {
        TableName: this.tableName,
        Key: { round_id },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  async getAllGameRound(
    getAllGameRoundByGameDto: GetAllGameRoundByGameDto,
  ): Promise<any> {
    try {
      const game_id: string = getAllGameRoundByGameDto.game_id;
      const params = {
        TableName: DynamoTables.GameRounds,
        IndexName: 'GameWinnerIndex',
        KeyConditionExpression: 'game_id = :gameId',
        ExpressionAttributeValues: {
          ':gameId': game_id,
        },
      };

      const { Items } = await this.dynamoDb.send(new QueryCommand(params));

      return Items;
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  async getGameByRound(
    getGameByRoundDto: GetGameByRoundDto,
  ): Promise<any> {
    try {

      const params = {
        TableName: DynamoTables.GameRounds,
        IndexName: 'GameRoundIndex',
        KeyConditionExpression: '#game_id = :game_id AND #game_round = :game_round',
        ExpressionAttributeNames: {
          '#game_id': 'game_id',
          '#game_round': 'game_round',
        },
        ExpressionAttributeValues: {
          ':game_id': getGameByRoundDto.game_id,
          ':game_round': getGameByRoundDto.game_round,
        },
      };
      const { Items } = await this.dynamoDb.send(new QueryCommand(params));

      return Items;
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  async createGameRound(
    gameRoundDto: GameRoundDto,
    updateInsertGameRoundDto: UpdateInsertGameRoundDto,
  ) {
    try {
      const params = {
        TableName: this.tableName,
        Item: { ...gameRoundDto, ...updateInsertGameRoundDto },
      };
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  private isInvalidCoinToss(
    first_player_result: number,
    second_player_result: number,
    first_player_op: string,
    second_player_op: string,
    coinTossOp: string[],
  ): boolean {
    // Check if the player results are different and at least one operation is not a valid coin toss operation
    const areResultsDifferent = first_player_result !== second_player_result;
    const isFirstPlayerOpInvalid = coinTossOp.includes(first_player_op);
    const isSecondPlayerOpInvalid = coinTossOp.includes(second_player_op);

    // Return true if both conditions are met, meaning the coin toss is invalid
    return (
      areResultsDifferent && (isFirstPlayerOpInvalid || isSecondPlayerOpInvalid)
    );
  }

  private calculateUpdatedResults(
    gameData: any,
    updateInsertGameRoundDto: any,
    coinTossOp: string[],
  ): {
    first_player_result: number;
    second_player_result: number;
    draw_result: number;
  } {
    const { first_player_result, second_player_result, draw_result } = gameData;

    // Update first player's result if they are the winner and their operation is not in coinTossOp
    const updatedFirstPlayerResult =
      updateInsertGameRoundDto.winner === 'first_player' &&
        !coinTossOp.includes(updateInsertGameRoundDto.first_player_op)
        ? first_player_result + 1
        : first_player_result;

    // Update second player's result if they are the winner and their operation is not in coinTossOp
    const updatedSecondPlayerResult =
      updateInsertGameRoundDto.winner === 'second_player' &&
        !coinTossOp.includes(updateInsertGameRoundDto.first_player_op)
        ? second_player_result + 1
        : second_player_result;

    const updatedDrawResult =
      updateInsertGameRoundDto.winner === 'draw' ? draw_result + 1 : draw_result;

    // Return the updated results
    return {
      first_player_result: updatedFirstPlayerResult,
      second_player_result: updatedSecondPlayerResult,
      draw_result: updatedDrawResult,
    };
  }

  async handleGameRound(updateInsertGameRoundDto: UpdateInsertGameRoundDto) {
    try {
      console.log("game round", updateInsertGameRoundDto);

      const gameData = await this.gameService.getGameById({
        game_id: updateInsertGameRoundDto.game_id,
      });

      if (!gameData) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Game data not found',
          data: [],
          error: ['Game data not found'],
        };
      }

      if (
        !['Playing', 'Ready'].includes(gameData.first_player_status) ||
        !['Playing', 'Ready'].includes(gameData.second_player_status)
      ) {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Game is not in playing state',
          data: [],
          error: ['Game is not in playing state'],
        };
      }

      // check if game round already exists
      const allGameRound = await this.getAllGameRound({
        game_id: updateInsertGameRoundDto.game_id,
      });

      const allGameRoundArray = allGameRound.map(
        (gameRound) => gameRound.game_round,
      );
      const expectedRound =
        allGameRoundArray.length === 0 ? 1 : Math.max(...allGameRoundArray) + 1;

      if (allGameRoundArray.includes(updateInsertGameRoundDto.game_round)) {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `Game round ${updateInsertGameRoundDto.game_round} already exists`,
          data: [],
          error: [`Game round ${updateInsertGameRoundDto.game_round} already exists`],
        };
      }

      if (
        expectedRound !== updateInsertGameRoundDto.game_round ||
        (gameData.first_player_status === GameStatus.Ready &&
          updateInsertGameRoundDto.game_round !== 1) ||
        (gameData.second_player_status === GameStatus.Ready &&
          updateInsertGameRoundDto.game_round !== 1)
      ) {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `expected game round is ${expectedRound}`,
          data: [],
          error: [`expected game round is ${expectedRound}`],
        };
      }

      const { first_player_result, second_player_result } = gameData;

      const isInvalidCoinToss = this.isInvalidCoinToss(
        first_player_result,
        second_player_result,
        updateInsertGameRoundDto.first_player_op,
        updateInsertGameRoundDto.second_player_op,
        this.coinTossOp,
      );

      if (isInvalidCoinToss) {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'cant coin toss when both player have different result',
          data: [],
          error: ['cant coin toss when both player have different result'],
        };
      }

      // update game status to playing
      if (updateInsertGameRoundDto.game_round === 1) {
        gameData.first_player_status = GameStatus.Playing;
        gameData.second_player_status = GameStatus.Playing;
      }

      const updatedResults = this.calculateUpdatedResults(
        gameData,
        updateInsertGameRoundDto,
        this.coinTossOp,
      );

      await this.gameService.updateGame({
        ...gameData,
        first_player_result: updatedResults.first_player_result,
        second_player_result: updatedResults.second_player_result,
        draw_result: updatedResults.draw_result,
      });

      // check the game correctly sending data

      const round_id = await this.generateUniqueId();

      await this.createGameRound(
        { round_id },
        updateInsertGameRoundDto,
      );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'game round created successfully',
        data: {},
        error: [],
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error creating game round Records',
        data: error.message,
        error: [error.message],
      };
    }
  }

  private isGameDataInvalid(
    winner: string,
    first_player_result: number,
    second_player_result: number,
    firstPlayerOp: string | null,
    secondPlayerOp: string | null,
  ): boolean {
    // Check if the first player shouldn't be the winner
    const isFirstPlayerInvalid =
      winner === 'first_player' &&
      ((first_player_result === second_player_result &&
        firstPlayerOp !== 'CoinTossWin') ||
        first_player_result < second_player_result);

    // Check if the second player shouldn't be the winner
    const isSecondPlayerInvalid =
      winner === 'second_player' &&
      ((first_player_result === second_player_result &&
        secondPlayerOp !== 'CoinTossWin') ||
        second_player_result < first_player_result);

    // Check if it's a draw but the results don't match
    const isDrawInvalid =
      winner === 'draw' && first_player_result !== second_player_result;

    // Return true if any of the conditions are invalid
    return isFirstPlayerInvalid || isSecondPlayerInvalid || isDrawInvalid;
  }


  async handleGameEnd(endGameRoundDto: EndGameRoundDto) {
    try {
      // add some general token
      console.log("game end", endGameRoundDto);

      const { game_id, winner } = endGameRoundDto;

      const gameData = await this.gameService.getGameById({ game_id });

      if (!gameData) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Game data not found',
          data: [],
          error: ['Game data not found'],
        };
      }
      // check if game data provided is correct

      if (
        gameData.first_player_status !== GameStatus.Playing ||
        gameData.second_player_status !== GameStatus.Playing
      ) {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Game is not in playing state',
          data: [],
          error: ['Game is not in playing state']
        }
      }

      const { first_player_result, second_player_result } = gameData;

      // check if game round already exists
      const allGameRound = await this.getAllGameRound({
        game_id,
      });

      const firstPlayerOp =
        allGameRound.filter((gameRound) =>
          this.coinTossOp.includes(gameRound.first_player_op),
        )[0]?.first_player_op || null;

      const secondPlayerOp =
        allGameRound.filter((gameRound) =>
          this.coinTossOp.includes(gameRound.second_player_op),
        )[0]?.second_player_op || null;

      const isInvalid = this.isGameDataInvalid(
        winner,
        first_player_result,
        second_player_result,
        firstPlayerOp,
        secondPlayerOp,
      );

      if (isInvalid) {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Game data provided is not correct',
          data: [],
          error: ['Game data provided is not correct'],
        };
      }

      // crete another function for AI
      if (gameData.source_type === SourceType.AI) {
        await this.gameService.gameRewardDistributionAi(
          endGameRoundDto,
          gameData,
        );
      } else {
        await this.gameService.gameRewardDistribution(
          endGameRoundDto,
          gameData,
        );
      }

      console.log({
        first_player_result,
        second_player_result,
        firstPlayerOp,
        secondPlayerOp,
        winner,
      });

      return {
        statusCode: HttpStatus.CREATED,
        message: 'game end successfully',
        data: {},
        error: [],
      };

    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error creating game round Records',
        data: error.message,
        error: [error.message],
      };
    }
  }

  async generateUniqueId(): Promise<string> {
    try {
      let generatedId = uuidv4();
      while (
        await this.dynamoService.isIdExist(
          generatedId,
          this.getTablePK(),
          this.getTableName(),
        )
      ) {
        generatedId = uuidv4();
      }

      return generatedId;
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  async updateGameRound(
    gameRoundDto: GameRoundDto,
    updateInsertGameRoundDto: UpdateInsertGameRoundDto,
  ) {
    try {
      const { round_id } = gameRoundDto;

      const params = updateParamsGenerator({ round_id }, updateInsertGameRoundDto, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  async deleteGameRound(gameRoundDto: GameRoundDto) {
    const params = {
      TableName: this.tableName,
      Key: {
        round_id: gameRoundDto.round_id,
      },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }
}
