/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import {
  DynamoDBClient
} from '@aws-sdk/client-dynamodb';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreateRoomDto } from './dto/create-room.dto';
import { CognitoService } from 'src/auth/cognito.service';
import { AppConfigService } from 'src/config/config.service';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PlayerService } from 'src/player/player.service';
import { WalletService } from 'src/wallet/wallet.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { percentageCalculate, updateParamsGenerator } from 'src/common/utils/util-functions.utility';
import { GameService } from 'src/game/game.service';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    private readonly cognitoService: CognitoService,
    private readonly configService: AppConfigService,
    private readonly playerService: PlayerService,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly gameService: GameService,
  ) {
    this.tableName = DynamoTables.Rooms;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'user_id';
  }

  getTableSK(): string {
    return 'room_id';
  }

  async validateAndCreateRoom(authUser: any, createRoomDto: CreateRoomDto) {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }

    //current user
    const currentPlayer = await this.playerService.getPlayerDetails(authUser);
    if (!currentPlayer) {
      throw new Error('You do not have a valid account');
    }

    // get pending room
    const [pendingRooms] = await this.getUserRoomsByStatus('Pending', authUser);

    // check if pending room is greater than 0
    if (pendingRooms) {
      throw new Error('You already have a pending room');
    }

    const [gameData] = await this.gameService.getPlayerPlayingGame(authUser.user_id);

    if (gameData) {
      throw new Error('You are already playing a game');
    }

    // get current balance
    const currentWallet = await this.walletService.getWalletByUserId(
      authUser,
    );

    if (
      !currentWallet ||
      currentWallet.balance_dollar - createRoomDto.amount <= 0
    ) {
      throw new Error('You do not have enough money');
    }

    // Generate a unique offer ID
    let generatedId = uuidv4().replace(/-/g, '').substring(0, 8);
    while (
      await this.dynamoService.isSubIdExist(
        authUser.user_id,
        this.getTablePK(),
        generatedId,
        this.getTableSK(),
        this.getTableName(),
      )
    ) {
      generatedId = uuidv4().replace(/-/g, '').substring(0, 8);
    }

    // Create the offer object
    const insertRoomDto = {
      user_id: authUser.user_id,
      user_name: currentPlayer.name,
      user_email: currentPlayer.email,
      user_img: currentPlayer.profile_img,
      room_id: generatedId,
      name: `Room_${generatedId}`,
      room_link: `${this.configService.mainURL}/Room_${generatedId}`,
      ...createRoomDto,
    };

    // create transaction

    await this.transactionService.validateAndCreateTransaction(
      authUser,
      {
        user_id: authUser.user_id,
        tx_type: "Game",
        tx_status: "Pending",
        tx_operation: 'Remove',
        coin_type: 'Dollar',
        amount: createRoomDto.amount,
        source_type: 'Room',
        source_id: generatedId,
        remarks: 'Room Created',
        updated_balance: currentWallet.balance_dollar - createRoomDto.amount,
        date: new Date().toISOString(),
      },
    );

    // Save the offer to the database
    return await this.createRoom({ ...insertRoomDto, status: 'Pending' });
  }

  async createRoom(createRoomDto: CreateRoomDto): Promise<any> {
    const params = {
      TableName: this.tableName,
      Item: createRoomDto,
    };

    try {
      await this.dynamoDb.send(new PutCommand(params));
      delete createRoomDto.room_pass;
      return createRoomDto;
    } catch (error) {
      console.error('Error inserting item:', error);
      throw new Error('Error creating Offer');
    }
  }

  async getAllRooms(): Promise<any> {
    const params = {
      TableName: this.tableName,
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items.map(item => ({ ...item, tickets: percentageCalculate(item.amount, 10) }));;
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error('Failed to scan the table');
    }
  }

  async getRoomsByType(type: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'RoomTypeIndex',
      KeyConditionExpression: '#roomType = :roomType',
      ExpressionAttributeValues: {
        ':roomType': type,
      },
      ExpressionAttributeNames: {
        '#roomType': 'type',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items.map(item => ({ ...item, tickets: percentageCalculate(item.amount, 10) }));
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }


  async getRoomsByStatus(status: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'RoomStatusIndex',
      KeyConditionExpression: '#roomStatus = :roomStatus',
      ExpressionAttributeValues: {
        ':roomStatus': status,
      },
      ExpressionAttributeNames: {
        '#roomStatus': 'status',
        '#s': 'status',
        "#n": "name",
        "#d": "date",
        "#t": "type"
      },
      ProjectionExpression: 'user_email, #s, #n, #d, user_id, user_img, amount, guest_id, room_link, user_name, room_id, #t',
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items.map(item => ({ ...item, tickets: percentageCalculate(item.amount, 10) }));
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getUserRooms(authUser: any): Promise<any> {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }
    // process
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: '#user_id = :userIdValue',
      ExpressionAttributeNames: {
        '#user_id': 'user_id',
      },
      ExpressionAttributeValues: {
        ':userIdValue': authUser.user_id,
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items.map(item => ({ ...item, tickets: percentageCalculate(item.amount, 10) }));;
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this Offer deos not exist');
    }
  }

  async getUserRoomsByType(type: string, authUser: any): Promise<any> {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }
    // process
    const params = {
      TableName: this.tableName,
      IndexName: 'RoomTypeIndex',
      KeyConditionExpression:
        '#roomType = :roomType AND #userId = :userIdValue',
      ExpressionAttributeValues: {
        ':roomType': type,
        ':userIdValue': authUser.user_id,
      },
      ExpressionAttributeNames: {
        '#roomType': 'type',
        '#userId': 'user_id',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items.map(item => ({ ...item, tickets: percentageCalculate(item.amount, 10) }));;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getUserRoomsByStatus(status: string, authUser: any): Promise<any> {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }
    // process
    const params = {
      TableName: this.tableName,
      IndexName: 'RoomStatusIndex',
      KeyConditionExpression:
        '#roomStatus = :roomStatus AND #userId = :userIdValue',
      ExpressionAttributeValues: {
        ':roomStatus': status,
        ':userIdValue': authUser.user_id,
      },
      ExpressionAttributeNames: {
        '#roomStatus': 'status',
        '#userId': 'user_id',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items.map(item => ({ ...item, tickets: percentageCalculate(item.amount, 10) }));;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getRoomById(authUser: any, roomId: string): Promise<any> {
    try {
      // Check if the user exists in Cognito
      const cognitoUser = await this.cognitoService.checkIfUserExists(
        authUser.user_id,
      );
      if (!cognitoUser) {
        throw new Error('You do not have a valid account');
      }
      // process
      const params = {
        TableName: this.tableName,
        Key: { user_id: authUser.user_id, room_id: roomId },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return { ...result.Item, tickets: percentageCalculate(result.Item.amount, 10) };
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getRoomByRoomId(roomId: string): Promise<any[]> {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: '#id = :id',
        ExpressionAttributeNames: {
          '#id': 'room_id',
        },
        ExpressionAttributeValues: {
          ':id': roomId,
        },
      };

      const command = new ScanCommand(params);
      const response = await this.dynamoDb.send(command);
      return response.Items.map(item => ({ ...item, tickets: percentageCalculate(item.amount, 10) })) || [];
    } catch (error) {
      throw new Error('Failed to query the index');
    }
  }

  async updateRoom(authUser: any, updateRoomDto: UpdateRoomDto) {
    try {
      // Check if the user exists in Cognito
      const cognitoUser = await this.cognitoService.checkIfUserExists(
        authUser.user_id,
      );
      if (!cognitoUser) {
        throw new Error('You do not have a valid account');
      }
      //check guest_id
      if (
        updateRoomDto.guest_id &&
        authUser.user_id == updateRoomDto.guest_id
      ) {
        throw new Error(`the guest should not be room's owner`);
      }

      const currentDetails = {
        ...updateRoomDto,
        user_id: authUser.user_id,
        room_link: `${this.configService.mainURL}/${updateRoomDto.room_id}_${updateRoomDto.name}`,
      };

      const { user_id, room_id, ...rest } = currentDetails;

      const params = updateParamsGenerator({ user_id, room_id }, rest, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return { ...result.Attributes, tickets: percentageCalculate(result.Attributes.amount, 10) };
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async deleteRoom(authUser: any, roomID: string): Promise<any> {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }
    // process
    const params = {
      TableName: this.tableName,
      Key: { user_id: authUser.user_id, room_id: roomID },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }

  async handleRoomDestroy(roomData: CreateRoomDto): Promise<any> {
    try {

      const [transactionData] = await this.transactionService.getTransactionsSourceId({ source_type: 'Room', source_id: roomData.room_id });

      if (!transactionData) {
        throw new Error('Transaction not found');
      }

      await this.transactionService.revertTransaction({ user_id: transactionData.user_id, tx_id: transactionData.tx_id },
        { ...transactionData, tx_status: 'Reverted', remarks: transactionData.remarks + " room destroyed" }
      );

      await this.updateRoom({ user_id: transactionData.user_id, room_id: roomData.room_id },
        { ...roomData, status: 'Destroyed' }
      );

      return true;
    }
    catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }
}
