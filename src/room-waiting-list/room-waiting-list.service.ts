/* eslint-disable prettier/prettier */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { CognitoService } from 'src/auth/cognito.service';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { AppConfigService } from 'src/config/config.service';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateRoomRequestDto } from './dto/create-room-request.dto';
import { RoomService } from 'src/room/room.service';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GetRequestsWithStatusAndRoomDto } from './dto/get-requests-status-room.dto';
import { GetRequestsWithStatusAndUserDto } from './dto/get-requests-status-user.dto';
import { UpdateRoomRequestDto } from './dto/update-room-request.dto';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';

@Injectable()
export class RoomWaitingListService {
  private readonly logger = new Logger(RoomWaitingListService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    private readonly cognitoService: CognitoService,
    private configService: AppConfigService,
    private readonly roomService: RoomService,
  ) {
    this.tableName = DynamoTables.RoomsWaitingList;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'id';
  }

  async validateAndCreateRoomRequest(
    authUser: any,
    createRoomRequestDto: CreateRoomRequestDto,
  ) {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }
    // Extract user's name from Cognito user attributes
    const name = cognitoUser.UserAttributes.find(
      (v) => v.Name === 'name',
    ).Value;



    // check the room
    const currentRoom = await this.roomService.getRoomByRoomId(
      createRoomRequestDto.room_id,
    );
    if (currentRoom.length === 0) {
      throw new Error('Room not Found');
    }

    if (currentRoom[0].user_id === authUser.user_id) {
      throw new Error(`As room's owner , you can not do request`);
    }

    // validate the user have request

    const [roomRequest] = await this.getRequestsByRoomAndUser(createRoomRequestDto.room_id, authUser.user_id);

    if (roomRequest) {
      throw new Error(`You have already requested to join this room`);
    }

    // Generate a unique offer ID
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

    // Create the request object
    const insertRoomDto = {
      id: generatedId,
      user_id: authUser.user_id,
      user_name: name,
      room_owner_id: currentRoom[0].user_id,
      room_name: currentRoom[0].name,
      ...createRoomRequestDto,
    };

    // Save the offer to the database
    return await this.createRequest(insertRoomDto);
  }

  async createRequest(
    createRoomRequestDto: CreateRoomRequestDto,
  ): Promise<any> {
    const params = {
      TableName: this.tableName,
      Item: createRoomRequestDto,
    };

    try {
      const result = await this.dynamoDb.send(new PutCommand(params));

      return result;
    } catch (error) {
      console.error('Error inserting item:', error);
      throw new Error('Error creating Offer');
    }
  }

  async getAllRequest(): Promise<any> {
    const params = {
      TableName: this.tableName,
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error('Failed to scan the table');
    }
  }

  async getRequestsByStatusAndRoom(
    getRequestsWithStatusAndRoomDto: GetRequestsWithStatusAndRoomDto,
  ): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'RoomWaitingListStatusRoomIndex',
      KeyConditionExpression: '#roomID = :roomID AND #reqStatus = :reqStatus',
      ExpressionAttributeValues: {
        ':roomID': getRequestsWithStatusAndRoomDto.room_id,
        ':reqStatus': getRequestsWithStatusAndRoomDto.status,
      },
      ExpressionAttributeNames: {
        '#roomID': 'room_id',
        '#reqStatus': 'status',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getRequestsByStatusAndUser(
    getRequestsWithStatusAndUserDto: GetRequestsWithStatusAndUserDto,
  ): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'RoomWaitingListStatusUserIndex',
      KeyConditionExpression: '#userID = :userID AND #reqStatus = :reqStatus',
      ExpressionAttributeValues: {
        ':userID': getRequestsWithStatusAndUserDto.user_id,
        ':reqStatus': getRequestsWithStatusAndUserDto.status,
      },
      ExpressionAttributeNames: {
        '#userID': 'user_id',
        '#reqStatus': 'status',
      }
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getRequestsByRoom(roomID: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'RoomIdIndex',
      KeyConditionExpression: '#roomID = :roomID',
      ExpressionAttributeValues: {
        ':roomID': roomID,
      },
      ExpressionAttributeNames: {
        '#roomID': 'room_id',
      }
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getRequestsByRoomAndUser(roomID: string, userID: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'RoomIdUserIdIndex',
      KeyConditionExpression: '#roomID = :roomID AND #userID = :userID',
      ExpressionAttributeValues: {
        ':roomID': roomID,
        ':userID': userID,
      },
      ExpressionAttributeNames: {
        '#roomID': 'room_id',
        '#userID': 'user_id',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getRequestsByUser(userID: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: '#userID = :userID',
      ExpressionAttributeValues: {
        ':userID': userID,
      },
      ExpressionAttributeNames: {
        '#userID': 'user_id',
      }
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getRequestById(requestId: string): Promise<any> {
    try {
      // process
      const params = {
        TableName: this.tableName,
        Key: { id: requestId },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async updateRequest(authUser: any, updateRoomRequestDto: UpdateRoomRequestDto) {
    try {
      // Check if the user exists in Cognito
      const cognitoUser = await this.cognitoService.checkIfUserExists(
        authUser.user_id,
      );
      if (!cognitoUser) {
        throw new Error('You do not have a valid account');
      }

      // get request deetails
      const currentRequest = await this.getRequestById(updateRoomRequestDto.id)
      if (!currentRequest) {
        throw new Error('Request not found');
      }
      //check owner
      if (currentRequest.room_owner_id !== authUser.user_id) {
        throw new Error(`you can not edit the request`);
      }

      // update the room
      let roomChanges = null
      if (updateRoomRequestDto.status === 'Accepted') {
        roomChanges = {
          room_id: currentRequest.room_id,
          name: currentRequest.room_name,
          status: 'Full',
          guest_id: currentRequest.user_id,
        };
      }

      const { id, ...rest } = updateRoomRequestDto;

      const params = updateParamsGenerator({ id }, rest, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));

      if (roomChanges) {
        await this.roomService.updateRoom(authUser, roomChanges)
      }
      return result.Attributes;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async deleteRoom(authUser: any, requestID: string): Promise<any> {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }
    // get request deetails
    const currentRequest = await this.getRequestById(requestID);
    if (!currentRequest) {
      throw new Error('Request not found');
    }
    if (currentRequest.status === 'Accepted') {
      throw new Error('you can not delete request,it is already accepted');
    }
    // process
    const params = {
      TableName: this.tableName,
      Key: { id: requestID },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }
}
