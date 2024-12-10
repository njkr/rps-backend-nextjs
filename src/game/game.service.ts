/* eslint-disable prettier/prettier */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { DynamoDBClient, Select } from '@aws-sdk/client-dynamodb';
import { PlayerGameDto } from './dto/player-game.dto';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { GameStatus, InsertGameDto, SourceType } from './dto/insert-game.dto';
import { v4 as uuidv4 } from 'uuid';
import { UpdateGameDto } from './dto/update-game.dto';
import { GetAllGameDto } from './dto/get-all-game.dto';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { GetGameByUserDto } from './dto/get-game-by-user.dto';
import { InsertGameTransactionDto } from './dto/insert-game-transaction.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { convertArrayToObject, percentageCalculate, updateParamsGenerator } from 'src/common/utils/util-functions.utility';
import { getCountBetweenDates, getTotalCount } from 'src/common/utils/dynamo.querry.utility';
import { DateFilterDto } from 'src/admin/dashboard/dto/date-filter.dto';
import * as  moment from 'moment';
import { EndGameRoundDto } from 'src/game-round/dto/end-game-round.dto';
import { PlayerService } from 'src/player/player.service';
import { TicketService } from 'src/ticket/ticket.service';
import { Status } from 'src/ticket/dto/update-insert-ticket.dto';
import { InsertGameApiDto } from './dto/insert-game-api.dto';
import { WalletService } from 'src/wallet/wallet.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CognitoService } from 'src/auth/cognito.service';
import { GamePlayerLeftDto } from './dto/game-player-left.dto';
import { AppConfigService } from 'src/app-config/app-config.service';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    private readonly transactionService: TransactionService,
    private readonly walletService: WalletService,
    private readonly playerService: PlayerService,
    @InjectQueue('game-timer') private readonly gameTimerQueue: Queue,
    @InjectQueue('jackpot') private readonly jackpotQueue: Queue,
    private readonly ticketService: TicketService,
    private readonly cognitoService: CognitoService,
    private readonly appConfigService: AppConfigService
  ) {
    this.tableName = DynamoTables.Games;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'game_id';
  }

  async getGameById(playerGameDto: PlayerGameDto): Promise<any> {
    try {
      const { game_id } = playerGameDto;
      const params = {
        TableName: this.tableName,
        Key: { game_id: game_id },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      throw new Error('Failed to query the getGameById');
    }
  }

  async getTodaysAndYesterdaysGameCount(): Promise<any> {

    const startOfMonth = moment().startOf('month').toISOString();  // Start of the month in ISO format
    const currentLiveDate = moment().toISOString();

    const additionalFilter = `(first_player_status = :first_player_status AND second_player_status = :second_player_status)`;

    const additionalExpressionAttributeValues = {
      ":first_player_status": { S: "Finished" },
      ":second_player_status": { S: "Finished" },
    };

    try {


      const monthCount = await getCountBetweenDates(
        {
          startDate: startOfMonth,
          endDate: currentLiveDate,
          tableName: this.tableName,
          attributeName: 'date',
          additionalFilterExpression: additionalFilter,
          additionalExpressionAttributeValues,
          additionalExpressionAttributeNames: {},
        },
        this.dynamoDb,
      );
      const totalCount = await getTotalCount(this.tableName, additionalFilter, additionalExpressionAttributeValues, {}, this.dynamoDb);

      return {
        monthCount,
        totalCount,
      };

    } catch (error) {

      console.error("Error querying DynamoDB:", error);
      throw error;

    }
  }

  async getAllGames(getAllPlayerGameDto: GetAllGameDto): Promise<any> {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: 'first_player = :user_Id OR second_player = :user_Id',
        ExpressionAttributeValues: {
          ':user_Id': getAllPlayerGameDto.user_id,
        },
      };
      const { Items, Count, ScannedCount } = await this.dynamoDb.send(
        new ScanCommand(params),
      );
      console.log(Count, ScannedCount);
      return Items;
    } catch (error) {
      throw new Error('Failed to query the getAllGames');
    }
  }


  async getGamesByTimeFrame(dateFilterDto: DateFilterDto): Promise<any> {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: "(#date BETWEEN :startDate AND :endDate)",
        ExpressionAttributeNames:
        {
          "#date": 'date',
        }
        ,
        ExpressionAttributeValues: {
          ":startDate": dateFilterDto.startDate,
          ":endDate": dateFilterDto.endDate,
        },
      };
      const { Items } = await this.dynamoDb.send(
        new ScanCommand(params),
      );
      return Items;
    } catch (error) {
      throw new Error('Failed to query the getAllGames');
    }
  }

  async getPlayerPlayingGame(first_player: string, second_player: string = null): Promise<any> {
    try {
      const params = {
        TableName: this.tableName,
        ConsistentRead: false,
        FilterExpression:
          `(#first_player = :firstPlayer OR #second_player = :firstPlayer ${second_player ? 'OR #first_player = :secondPlayer OR #second_player = :secondPlayer' : ''}) AND ` +
          '(#first_player_status IN (:statusPlaying, :statusReady, :statusPending) OR ' +
          '#second_player_status IN (:statusPlaying, :statusReady, :statusPending)) AND ' +
          '#first_player_status <> :statusRefused AND #second_player_status <> :statusRefused',
        ExpressionAttributeValues: {
          ':firstPlayer': first_player,
          ...(second_player ? { ':secondPlayer': second_player } : {}),
          ':statusPlaying': 'Playing',
          ':statusReady': 'Ready',
          ':statusPending': 'Pending',
          ':statusRefused': 'Refused',
        },
        ExpressionAttributeNames: {
          '#first_player': 'first_player',
          '#second_player': 'second_player',
          '#first_player_status': 'first_player_status',
          '#second_player_status': 'second_player_status',
        },
      };

      const { Items } = await this.dynamoDb.send(new ScanCommand(params));
      return Items;
    } catch (error) {
      throw new Error('Failed to query the playing games');
    }
  }

  async getGamesByUser(getGameByUserDto: GetGameByUserDto): Promise<any> {
    try {
      const params = {
        TableName: this.tableName,
        Key: { game_id: getGameByUserDto.game_id },
        FilterExpression: 'first_player = :user_Id OR second_player = :user_Id',
        ExpressionAttributeValues: {
          ':user_Id': getGameByUserDto.user_id,
        },
      };
      const { Item } = await this.dynamoDb.send(new GetCommand(params));
      return Item;
    } catch (error) {
      throw new Error('Failed to query the getGamesByUser');
    }
  }

  async handleCretePlayerGame(insertGameApiDto: InsertGameApiDto) {
    try {

      const { first_player, second_player, amount } = insertGameApiDto;

      const [firstPlayerExists, secondPlayerExists] =
        await Promise.all([this.cognitoService.checkIfUserExists(first_player), await this.cognitoService.checkIfUserExists(second_player)]);

      if (!firstPlayerExists || !secondPlayerExists) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'one of the player not found',
          data: null,
          errors: ['one of the player not found'],
        };
      }

      const playerPlayingGame = await this.getPlayerPlayingGame(first_player, second_player);

      if (playerPlayingGame.length > 0) {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'player already playing game',
          data: playerPlayingGame,
          errors: ['player already playing game'],
        };
      }

      const firstPlayerWallet = await this.walletService.getWalletByUserId({
        user_id: first_player,
      });
      const secondPlayerWallet = await this.walletService.getWalletByUserId({
        user_id: second_player,
      });

      if (!firstPlayerWallet || !secondPlayerWallet) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'player wallet not found',
          data: null,
          errors: ['player wallet not found'],
        };
      }

      if (
        firstPlayerWallet.balance_dollar < amount ||
        secondPlayerWallet.balance_dollar < amount
      ) {
        return {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: 'player wallet balance not enough',
          data: null,
          errors: ['player wallet balance not enough'],
        }
      }

      const game_id = await this.generateUniqueId();
      await this.createGameTransactionTwoPlayers({
        game_id,
        ...insertGameApiDto,
      });

      const firstPlayerData = convertArrayToObject(
        firstPlayerExists.UserAttributes,
      );
      const secondPlayerData = convertArrayToObject(
        secondPlayerExists.UserAttributes,
      );

      const [firstPlayerTicket] =
        await this.ticketService.getTicketsByUserWinnerType(
          firstPlayerData.sub,
          [null],
          Status.VALID,
        );

      const [secondPlayerTicket] =
        await this.ticketService.getTicketsByUserWinnerType(
          secondPlayerData.sub,
          [null],
          Status.VALID,
        );

      const insertPlayerGameDto = new InsertGameDto();
      insertPlayerGameDto.source_id = 'Matchmaking';
      insertPlayerGameDto.source_type = SourceType.Game;
      insertPlayerGameDto.first_player = first_player;
      insertPlayerGameDto.second_player = second_player;
      insertPlayerGameDto.amount = amount * 2;
      insertPlayerGameDto.first_player_ticket = firstPlayerTicket?.amount || 0;
      insertPlayerGameDto.second_player_ticket = secondPlayerTicket?.amount || 0;
      insertPlayerGameDto.first_player_name = firstPlayerData.name;
      insertPlayerGameDto.second_player_name = secondPlayerData.name;
      insertPlayerGameDto.first_player_image = firstPlayerData?.picture || null;
      insertPlayerGameDto.second_player_image = secondPlayerData?.picture || null;

      await this.createPlayerGame({ game_id }, insertPlayerGameDto);

      await this.playerService.updatePlayerGameStatuses([
        {
          userId: insertPlayerGameDto.first_player,
          lastGameDate: true,
          incrementGames: 1,
        },

        {
          userId: insertPlayerGameDto.second_player,
          lastGameDate: true,
          incrementGames: 1,
        },
      ]);

      const name = 'game-timer';

      await this.gameTimerQueue.addBulk([
        {
          name,
          data: { game_id, first_player, second_player },
          opts: { attempts: 0, backoff: 5000, delay: 35000 },
        },
        {
          name: name + '-end',
          data: { game_id, first_player, second_player },
          opts: { attempts: 0, backoff: 5000, delay: 150000 },
        },
      ]);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'players Game created successfully',
        data: { ...insertPlayerGameDto, game_id },
        errors: [],
      }

    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error creating Game Records',
        data: error.message,
        errors: ['Error creating Game Records'],
      }
    }
  }

  private async getPlayersGame(
    first_player: string,
    second_player: string,
    game_id: string,
    status: GameStatus[],
  ): Promise<any> {
    const gameData = await this.getGameById({ game_id });

    if (!gameData) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'game not found',
        data: [],
        errors: ['game not found'],
      };
    }

    if (
      gameData.first_player !== first_player ||
      gameData.second_player !== second_player
    ) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Error wrong game id',
        data: [],
        errors: ['Error wrong game id'],
      };
    }

    if (
      !status.includes(gameData.first_player_status) ||
      !status.includes(gameData.second_player_status)
    ) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: `Error wrong game status status must be ${status.join(',')}`,
        data: [],
        errors: [`Error wrong game status status must be ${status.join(',')}`],
      };
    }

    return gameData;
  }

  async handlePlayerLeft(gamePlayerLeftDto: GamePlayerLeftDto,) {
    try {

      const gameData = await this.getPlayersGame(
        gamePlayerLeftDto.first_player,
        gamePlayerLeftDto.second_player,
        gamePlayerLeftDto.game_id,
        [GameStatus.Playing],
      );

      if (gameData?.errors) return gameData;

      //end game

      let newGameData = {};

      if (gameData.source_type === 'AI') {
        newGameData = await this.gameRewardDistributionAi(
          {
            game_id: gamePlayerLeftDto.game_id,
            winner: gamePlayerLeftDto.winner,
          },
          gameData,
        );
      } else {
        newGameData = await this.gameRewardDistribution(
          {
            game_id: gamePlayerLeftDto.game_id,
            winner: gamePlayerLeftDto.winner,
          },
          gameData,
        );
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Player left game',
        data: { ...newGameData },
        errors: [],
      };

    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error player left game',
        data: [],
        errors: [error.message],
      }
    }
  }

  async createPlayerGame(
    playerGameDto: PlayerGameDto,
    insertPlayerGameDto: InsertGameDto,
  ) {
    try {
      const params = {
        TableName: this.tableName,
        Item: { ...playerGameDto, ...insertPlayerGameDto },
      };
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      throw new Error('Failed to query the createPlayerGame');
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
      throw new Error('Failed to query the generateUniqueId');
    }
  }

  async getGamesBySourceId(sourceId: string): Promise<any[]> {
    const params = {
      TableName: this.tableName,
      IndexName: 'GameSourceIdIndex',
      KeyConditionExpression: 'source_id = :sourceId',
      ExpressionAttributeValues: {
        ':sourceId': sourceId,
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying getGamesBySourceId', error);
      throw new Error('Failed to query the getGamesBySourceId');
    }
  }

  async getGameStatusBySource(source_id: string): Promise<any> {
    try {
      const params = {
        TableName: this.tableName, // Replace with your actual table name if needed
        ConsistentRead: false,
        FilterExpression:
          '(#source_id = :sourceId) AND (#first_player_status IN (:statusPlaying, :statusReady) OR #second_player_status IN (:statusPlaying, :statusReady))',
        ExpressionAttributeValues: {
          ':sourceId': source_id,
          ':statusPlaying': 'Playing',
          ':statusReady': 'Ready',
        },
        ExpressionAttributeNames: {
          '#source_id': 'source_id',
          '#first_player_status': 'first_player_status',
          '#second_player_status': 'second_player_status',
        },
      };
      const { Items } = await this.dynamoDb.send(new ScanCommand(params));
      return Items;
    } catch (error) {
      throw new Error('Failed to query the playing games');
    }
  }

  async getGameCountByStatus(status: string): Promise<number> {
    try {

      const params = {
        TableName: this.tableName,
        Select: Select.COUNT,
        FilterExpression: "#first_status = :game_status AND #second_status = :game_status",
        ExpressionAttributeNames: {
          "#first_status": "first_player_status",
          "#second_status": "second_player_status"
        },
        ExpressionAttributeValues: {
          ":game_status": status
        }
      };

      // Execute the scan command
      const result = await this.dynamoDb.send(new ScanCommand(params));

      // Log and return the count
      const count = result.Count || 0;
      return count;
    } catch (error) {
      console.error("Error fetching playing counts:", error);
    }
  }

  async createGameTransactionTwoPlayers(
    insertGameTransactionDto: InsertGameTransactionDto,
  ): Promise<true> {
    try {
      const { game_id, first_player, second_player, amount } =
        insertGameTransactionDto;

      const params = {
        tx_type: 'Game',
        tx_status: 'Pending',
        tx_operation: 'Remove',
        coin_type: 'Dollar',
        amount: amount,
        source_type: 'Matchmaking',
        source_id: game_id,
        game_id,
        remarks: 'matchmaking game created',
        date: new Date().toISOString(),
      };

      // create transaction
      await this.transactionService.validateAndCreateTransaction(
        {
          user_id: first_player,
        },
        {
          ...params,
          user_id: first_player,
        },
      );

      await this.transactionService.validateAndCreateTransaction(
        {
          user_id: second_player,
        },
        {
          ...params,
          user_id: second_player,
        },
      );

      return true;
    } catch (error) {
      throw new Error(error);
    }
  }

  async createGameTransaction(amount: number, user_id: string, game_id: string, coin_type: string, tx_type: string, remarks: string, referral_earnings: boolean = false): Promise<true> {

    try {

      await this.transactionService.validateAndCreateTransaction(
        {
          user_id,
        },
        {
          user_id,
          tx_type,
          tx_status: "Success",
          tx_operation: 'Add',
          coin_type,
          amount: amount,
          source_type: 'Game',
          source_id: game_id,
          game_id,
          remarks,
          referral_earnings,
          date: new Date().toISOString(),
        },
      );

      return true;
    } catch (error) {
      throw new Error(error);
    }
  }

  async updateGame(updatePlayerGameDto: UpdateGameDto) {
    try {

      const { game_id, ...rest } = updatePlayerGameDto;

      const params = updateParamsGenerator({ game_id }, rest, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      throw new Error(error);
    }
  }

  async deleteGame(playerGameDto: PlayerGameDto) {
    const params = {
      TableName: this.tableName,
      Key: {
        game_id: playerGameDto.game_id,
      },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }


  async distributeReferralAmount(user_id: string, game_id: string, serviceChargesTemp: number): Promise<void> {
    try {

      const PlayerDetails = await this.playerService.getPlayerDetailsById(user_id);

      const { referral_first_percentage, referral_second_percentage } = await this.appConfigService.getAppConfig();

      let serviceCharges = serviceChargesTemp;

      if (PlayerDetails.referred_by) {

        const firstReferer = await this.playerService.getUserByUid(PlayerDetails.referred_by);

        if (firstReferer) {

          const firstRefererAmount = percentageCalculate(serviceCharges, referral_first_percentage);
          serviceCharges -= firstRefererAmount;

          // update first referer's amount
          await this.createGameTransaction(firstRefererAmount, firstReferer.user_id, game_id, "Dollar", 'First Referral Earning', `Game Referral Earning 8% form ${user_id}`, true);

          if (firstReferer.referred_by) {

            const secondReferer = await this.playerService.getUserByUid(firstReferer.referred_by);

            if (secondReferer) {

              const secondRefererAmount = percentageCalculate(serviceCharges, referral_second_percentage);
              serviceCharges -= secondRefererAmount;

              // update second referer's amount
              await this.createGameTransaction(secondRefererAmount, secondReferer.user_id, game_id, "Dollar", 'Second Referral Earning', `Game Referral Earning 4% form ${user_id}`, true);

            }

          }
        }

      }

      // add to company wallet
      await this.transactionService.depositCompanyWallet({
        user_id: "null",
        tx_type: 'Service Fee',
        tx_status: "Success",
        tx_operation: 'Add',
        coin_type: 'Dollar',
        amount: serviceCharges,
        source_type: 'Game',
        source_id: game_id,
        game_id,
        remarks: 'game Service Fee',
        date: new Date().toISOString(),
      });

    } catch (error) {
      throw new Error('Failed to distribute amount');
    }
  }

  async gameRewardDistribution(
    endGameRoundDto: EndGameRoundDto,
    updateGameDto: UpdateGameDto,
  ): Promise<any> {
    try {

      const { winner, game_id } = endGameRoundDto;

      const [first_player_transaction] = await this.transactionService.getTransactionsByGameId(updateGameDto.first_player, updateGameDto.game_id);
      const [second_player_transaction] = await this.transactionService.getTransactionsByGameId(updateGameDto.second_player, updateGameDto.game_id);

      if (!first_player_transaction || !second_player_transaction) {
        throw new Error('Transaction not found');
      }

      if (winner === "draw") {
        await this.transactionService.revertTransaction({ user_id: first_player_transaction.user_id }, { ...first_player_transaction, tx_status: 'Reverted', remarks: second_player_transaction.remarks + " | game draw" });
        await this.transactionService.revertTransaction({ user_id: second_player_transaction.user_id }, { ...second_player_transaction, tx_status: 'Reverted', remarks: second_player_transaction.remarks + " | game draw" });
        await this.updateGame({ ...updateGameDto, first_player_status: GameStatus.Finished, second_player_status: GameStatus.Finished, winner });
        await this.playerService.updatePlayerGameStatuses(
          [{
            userId: first_player_transaction.user_id,
            lastGameDate: true, incrementDraws: 1
          }, {
            userId: second_player_transaction.user_id,
            lastGameDate: true, incrementDraws: 1
          }],
        );
        return true;
      }

      const totalAmount = first_player_transaction.amount + second_player_transaction.amount;
      const winnerAmount = percentageCalculate(totalAmount, 80);
      const serviceChargesTemp = percentageCalculate(totalAmount, 10);
      const ticketAmount = percentageCalculate(first_player_transaction.amount, 10);

      // make old transaction success
      await this.transactionService.updateTransaction({ user_id: first_player_transaction.user_id }, { ...first_player_transaction, tx_status: "Success", remarks: first_player_transaction.remarks + " , Transaction Status: Success", updated_date: new Date().toISOString() });
      await this.transactionService.updateTransaction({ user_id: second_player_transaction.user_id }, { ...second_player_transaction, tx_status: "Success", remarks: second_player_transaction.remarks + " , Transaction Status: Success", updated_date: new Date().toISOString() });

      // add jackpot amount
      await this.jackpotQueue.add("jackpot", {
        first_player_ticket_amount: ticketAmount,
        game_id,
        second_player_ticket_amount: ticketAmount,
        first_player: first_player_transaction.user_id,
        second_player: second_player_transaction.user_id,
        winner
      },
        {
          removeOnComplete: true,
          attempts: 3,
          deduplication: {
            id: game_id
          }
        });


      switch (winner) {
        case "first_player":
          await this.createGameTransaction(winnerAmount, first_player_transaction.user_id, updateGameDto.game_id, first_player_transaction.coin_type, 'Win', `${first_player_transaction.remarks} | won the game`);
          await this.transactionService.depositPlayerLc({
            user_id: second_player_transaction.user_id,
            tx_type: 'Loss',
            tx_status: "Success",
            tx_operation: 'Add',
            coin_type: 'LC',
            amount: second_player_transaction.amount,
            source_type: 'Game',
            source_id: game_id,
            game_id,
            remarks: `${second_player_transaction.remarks} | loose the game and got lucky coin`,
            date: new Date().toISOString(),
          });

          await this.playerService.updatePlayerGameStatuses(
            [{
              userId: first_player_transaction.user_id,
              lastGameDate: true, incrementWins: 1
            }, {
              userId: second_player_transaction.user_id,
              lastGameDate: true, incrementLoss: 1
            }],
          );

          await this.distributeReferralAmount(first_player_transaction.user_id, updateGameDto.game_id, serviceChargesTemp);

          break;
        case "second_player":
          await this.createGameTransaction(winnerAmount, second_player_transaction.user_id, updateGameDto.game_id, second_player_transaction.coin_type, 'Win', `${second_player_transaction.remarks} | won the game`);
          await this.transactionService.depositPlayerLc({
            user_id: first_player_transaction.user_id,
            tx_type: 'Loss',
            tx_status: "Success",
            tx_operation: 'Add',
            coin_type: 'LC',
            amount: first_player_transaction.amount,
            source_type: 'Game',
            source_id: game_id,
            game_id,
            remarks: `${first_player_transaction.remarks} | loose the game and got lucky coin`,
            date: new Date().toISOString(),
          });

          await this.playerService.updatePlayerGameStatuses(
            [{
              userId: second_player_transaction.user_id,
              lastGameDate: true, incrementWins: 1
            }, {
              userId: first_player_transaction.user_id,
              lastGameDate: true, incrementLoss: 1
            }],
          );

          await this.distributeReferralAmount(second_player_transaction.user_id, updateGameDto.game_id, serviceChargesTemp);

          break;
      }

      const [firstPlayerTicket] = await this.ticketService.getTicketsByUserWinnerType(first_player_transaction.user_id, [null], Status.VALID);
      const [secondPlayerTicket] = await this.ticketService.getTicketsByUserWinnerType(second_player_transaction.user_id, [null], Status.VALID);

      const data = {
        ...updateGameDto,
        first_player_status: GameStatus.Finished,
        second_player_status: GameStatus.Finished,
        winner,
        win_dollar: winnerAmount,
        win_lc: first_player_transaction.amount,
        first_player_ticket: firstPlayerTicket?.amount || 0,
        second_player_ticket: secondPlayerTicket?.amount || 0,
      };

      await this.updateGame(data);

      return data;

    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  async gameRewardDistributionAi(
    endGameRoundDto: EndGameRoundDto,
    updateGameDto: UpdateGameDto,
  ): Promise<any> {
    try {

      const { winner, game_id } = endGameRoundDto;

      const [first_player_transaction] = await this.transactionService.getTransactionsByGameId(updateGameDto.first_player, updateGameDto.game_id);

      if (!first_player_transaction) {
        throw new Error('Transaction not found');
      }

      if (winner === 'draw') {
        await this.transactionService.revertTransaction({ user_id: first_player_transaction.user_id }, {
          ...first_player_transaction,
          tx_status: 'Reverted',
          remarks: first_player_transaction.remarks + ' | game draw',
        },
        );
        await this.updateGame({
          ...updateGameDto,
          first_player_status: GameStatus.Finished,
          second_player_status: GameStatus.Finished,
          winner,
        });
        return true;
      }

      const totalAmount = first_player_transaction.amount;

      // make old transaction success
      await this.transactionService.updateTransaction(
        { user_id: first_player_transaction.user_id },
        {
          ...first_player_transaction,
          tx_status: 'Success',
          remarks:
            first_player_transaction.remarks + ' , Transaction Status: Success',
          updated_date: new Date().toISOString(),
        },
      );

      // transfer to second player
      const winnerId = winner === 'first_player' ? updateGameDto.first_player : updateGameDto.second_player;

      if (winner === 'first_player') {
        await this.playerService.updatePlayerGameStatuses(
          [{
            userId: winnerId,
            lastGameDate: true, incrementWins: 1
          },],
        );
      }

      await this.transactionService.validateAndCreateTransaction(
        { user_id: winnerId },
        {
          user_id: winnerId,
          tx_type: 'Win',
          tx_status: 'Success',
          tx_operation: 'Add',
          coin_type: 'LC',
          amount: totalAmount,
          source_type: 'Game',
          source_id: game_id,
          game_id,
          remarks: `AI game won lucky coin`,
          date: new Date().toISOString(),
        }
      );

      const data = { ...updateGameDto, first_player_status: GameStatus.Finished, second_player_status: GameStatus.Finished, winner, win_lc: totalAmount };

      await this.updateGame(data);
      return data;
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }
}
