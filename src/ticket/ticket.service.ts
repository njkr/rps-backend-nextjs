/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoService } from 'src/dynamo/dynamo.service';

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { GetAllTicketDto } from './dto/get-all-ticket.dto';
import { UpdateInsertTicketDto, Status } from './dto/update-insert-ticket.dto';
import { TicketDto } from './dto/ticket.dto';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { CreateOrUpdateTicketDto } from './dto/create-or-update-ticket.dto';
import { PlayerService } from 'src/player/player.service';
import { generateUniqueSubId, updateParamsGenerator } from 'src/common/utils/util-functions.utility';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    private readonly playerService: PlayerService,
  ) {
    this.tableName = DynamoTables.UserTickets;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'user_id';
  }

  getTableSK(): string {
    return 'ticket_id';
  }

  async getTicketById(ticketDto: TicketDto): Promise<any> {
    try {
      const { ticket_id, user_id } = ticketDto;
      const params = {
        TableName: this.tableName,
        Key: { user_id: user_id, ticket_id: ticket_id },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getTicketsByJackpotStatus(jackpotId: string, status: Array<string>, userId: string = null): Promise<any> {

    const statusValues = {};
    const statusPlaceholders = [];

    // Build ExpressionAttributeValues and FilterExpression dynamically based on statuses
    status.forEach((stat, index) => {
      const placeholder = `:status${index}`;
      statusValues[placeholder] = stat;
      statusPlaceholders.push(placeholder);
    });

    // Start with the base FilterExpression
    let filterExpression = `jackpot_id = :jackpot_id`;

    if (status.length === 1) {
      filterExpression += ` AND #status = ${statusPlaceholders[0]}`;
    } else if (status.length > 1) {
      filterExpression += ` AND #status IN (${statusPlaceholders.join(', ')})`;
    }

    if (userId) {
      filterExpression += ` AND user_id = :user_id`;
    }

    // Build the params object
    const params: any = {
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: {
        ':jackpot_id': jackpotId,
        ...(status.length > 0 ? statusValues : {}),
        ...(userId ? { ':user_id': userId } : {})  // Add user_id if it's provided
      }
    };

    if (status.length > 0) {
      params.ExpressionAttributeNames = {
        '#status': 'status'
      };
    }

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items.sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error('Failed to scan the table');
    }
  }

  async getTicketsWinnerType(jackpotId: string, jackpotWinnerType: Array<string>): Promise<any> {

    const jackpotWinnerTypeValues = {};
    const jackpotWinnerTypePlaceholders = [];

    //
    jackpotWinnerType.forEach((stat, index) => {
      const placeholder = `:place${index}`;
      jackpotWinnerTypeValues[placeholder] = stat;
      jackpotWinnerTypePlaceholders.push(placeholder);
    });


    let filterExpression = `jackpot_id = :jackpot_id`;

    if (jackpotWinnerType.length === 1) {

      filterExpression += ` AND #jackpot_winner_type = ${jackpotWinnerTypePlaceholders[0]}`;
    } else if (jackpotWinnerType.length > 1) {

      filterExpression += ` AND #jackpot_winner_type IN (${jackpotWinnerTypePlaceholders.join(', ')})`;
    }


    const params: any = {
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: {
        ':jackpot_id': jackpotId,
        ...(jackpotWinnerType.length > 0 ? jackpotWinnerTypeValues : {})
      }
    };


    if (jackpotWinnerType.length > 0) {
      params.ExpressionAttributeNames = {
        '#jackpot_winner_type': 'jackpot_winner_type'
      };
    }

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items.sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error('Failed to scan the table');
    }
  }

  async getTicketsByUserWinnerType(user_id: string, jackpotWinnerType: Array<string> = [], status: string = null): Promise<any> {

    const jackpotWinnerTypeValues = {};
    const statusValues = {};
    const jackpotWinnerTypePlaceholders = [];

    let filterExpression = '';

    jackpotWinnerType.forEach((stat, index) => {
      const placeholder = `:place${index}`;
      jackpotWinnerTypeValues[placeholder] = stat;
      jackpotWinnerTypePlaceholders.push(placeholder);
    });

    // Add conditions for jackpot_winner_type
    if (jackpotWinnerType.length === 1) {
      filterExpression += `#jackpot_winner_type = ${jackpotWinnerTypePlaceholders[0]}`;
    } else if (jackpotWinnerType.length > 1) {
      filterExpression += `#jackpot_winner_type IN (${jackpotWinnerTypePlaceholders.join(', ')})`;
    }

    // Add condition for status
    if (status) {
      if (filterExpression) filterExpression += ' AND ';
      filterExpression += `#status = :status`;
      statusValues[':status'] = status;
    }

    const params: any = {
      TableName: this.tableName,
      KeyConditionExpression: 'user_id = :user_id',
      ExpressionAttributeValues: {
        ':user_id': user_id,
      }
    };

    // Only add FilterExpression and ExpressionAttributeNames if we have conditions
    if (filterExpression) {
      params.FilterExpression = filterExpression;
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ...(jackpotWinnerType.length > 0 ? jackpotWinnerTypeValues : {}),
        ...(status ? statusValues : {})
      };
      params.ExpressionAttributeNames = {
        ...(jackpotWinnerType.length > 0 && { '#jackpot_winner_type': 'jackpot_winner_type' }),
        ...(status && { '#status': 'status' }),
      };
    }

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items.sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error('Failed to scan the table');
    }
  }

  async getUserTicketsByJackpotStatus(user_id: string, jackpotId: string, status: string): Promise<any> {

    const params = {
      TableName: this.tableName,
      IndexName: 'JackpotStatusIndex',
      KeyConditionExpression: 'jackpot_id = :jackpot_id AND #status = :status',
      FilterExpression: 'user_id = :user_id',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':jackpot_id': jackpotId,
        ':status': status,
        ':user_id': user_id,
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

  async getUserTicketsByStatusWinType(
    user_id: string,
    status: string,
    winType: string | null,
  ): Promise<any> {
    // Base params for DynamoDB query
    const params: any = {
      TableName: this.tableName,
      KeyConditionExpression: '#uid = :uid',
      FilterExpression: '#status = :status AND #winType <> :winType',
      ExpressionAttributeNames: {
        '#uid': 'user_id',
        '#status': 'status',
        '#winType': 'jackpot_winner_type',
      },
      ExpressionAttributeValues: {
        ':uid': user_id,
        ':status': status,
        ':winType': winType,
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

  async getAllTicketById(getAllTicketDto: GetAllTicketDto): Promise<any> {
    try {
      let allTickets = [];
      const lastEvaluatedKey = getAllTicketDto.lastEvaluatedKey;
      const limit = getAllTicketDto.limit;
      do {
        const params = {
          TableName: this.tableName,
          KeyConditionExpression: '#uid = :uid',
          ExpressionAttributeNames: {
            '#uid': 'user_id',
          },
          ExpressionAttributeValues: {
            ':uid': getAllTicketDto.user_id,
          },
          Limit: limit,
          ExclusiveStartKey: lastEvaluatedKey
            ? { [lastEvaluatedKey.toString()]: undefined }
            : undefined,
        };

        const { Items, ScannedCount, Count } = await this.dynamoDb.send(
          new QueryCommand(params),
        );
        console.log(ScannedCount, Count);
        allTickets = [...allTickets, ...Items];
      } while (lastEvaluatedKey);

      return allTickets;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async createTicket(
    ticketDto: TicketDto,
    updateInsertTicketDto: UpdateInsertTicketDto,
  ) {
    try {
      const params = {
        TableName: this.tableName,
        Item: { ...ticketDto, ...updateInsertTicketDto },
      };
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async generateUniqueId(tablePKValue: string): Promise<string> {
    return await generateUniqueSubId(tablePKValue, this.getTablePK(), this.getTableSK(), this.getTableName(), this.dynamoService);
  }

  async createTicketOrUpdate(createOrUpdateTicketDto: CreateOrUpdateTicketDto): Promise<any> {
    try {

      const [userTicketData] = await this.getUserTicketsByJackpotStatus(createOrUpdateTicketDto.user_id, createOrUpdateTicketDto.jackpot_id, "Valid");

      const { name, profile_img } = await this.playerService.getPlayerDetailsById(createOrUpdateTicketDto.user_id);

      if (userTicketData) {

        const { user_id, ticket_id, ...rest } = userTicketData;
        await this.updateTicket({ user_id, ticket_id },
          { ...rest, name, profile_img, amount: userTicketData.amount + createOrUpdateTicketDto.amount, game_id: createOrUpdateTicketDto.game_id, updated_date: new Date().toISOString() });
      } else {


        const ticket_id = await this.generateUniqueId(createOrUpdateTicketDto.user_id);

        await this.createTicket({ user_id: createOrUpdateTicketDto.user_id, ticket_id },
          {
            user_name: name,
            profile_img,
            jackpot_id: createOrUpdateTicketDto.jackpot_id,
            amount: createOrUpdateTicketDto.amount,
            status: Status.VALID,
            game_id: createOrUpdateTicketDto.game_id,
            jackpot_winner_type: null,
            jackpot_rank: null,
            jackpot_win_amount: null,
            date: new Date().toISOString(),
          });

      }

      return true;
    } catch (error) {
      console.error('Error creating item:', error);
      throw new Error('Failed to creating the item');
    }
  }

  async updateTicket(
    ticketDto: TicketDto,
    updateInsertTicketDto: UpdateInsertTicketDto,
  ) {
    try {

      const { user_id, ticket_id } = ticketDto;

      const params = updateParamsGenerator({ user_id, ticket_id }, updateInsertTicketDto, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('Error update item:', error);
      throw new Error('Failed to update the item');
    }
  }

  async deleteTicket(ticketDto: TicketDto) {
    const params = {
      TableName: this.tableName,
      Key: {
        user_id: ticketDto.user_id,
        ticket_id: ticketDto.ticket_id,
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
