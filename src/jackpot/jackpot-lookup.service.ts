/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { CreateJackpotLookupDto } from './dto/create-jackpot-lookup.dto';
import { UpdateJackpotLookupDto } from './dto/update-jackpot-lookup.dto';
import { v4 as uuidv4 } from 'uuid';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';

@Injectable()
export class JackpotLookupService {
  private readonly logger = new Logger(JackpotLookupService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoService) {
    this.tableName = DynamoTables.JackpotLookup;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'id';
  }

  getTableSK(): string {
    return 'place';
  }

  async createLookupRecord(
    createJackpotLookupDto: CreateJackpotLookupDto,
  ): Promise<any> {
    //generate auto id
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

    const params = {
      TableName: this.tableName,
      Item: {
        ...createJackpotLookupDto,
        id: generatedId,
      },
    };

    try {
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error inserting item:', error);
      throw new Error('Error creating Jackpot Lookup record');
    }
  }

  async getLookupRecordById(id: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      Key: { id: id },
    };

    try {
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this recoed deos not exist');
    }
  }

  async getLookupRecordByPlace(place: string): Promise<any> {

    const params = {
      TableName: this.getTableName(),
      FilterExpression: `#place = :place`,
      ExpressionAttributeNames: {
        '#place': 'place',
      },
      ExpressionAttributeValues: {
        ':place': place,
      }
    };
    const command = new ScanCommand(params);

    try {
      const [data] = (await this.dynamoDb.send(command)).Items;
      return data;
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  async getAllJackpotRecords(): Promise<any> {
    const params = {
      TableName: this.tableName,
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items.sort((a, b) => b.prize_per_winner - a.prize_per_winner);
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error('Failed to scan the table');
    }
  }

  async updateLookupRecord(
    updateJackpotLookupDto: UpdateJackpotLookupDto,
  ): Promise<any> {
    const params = {
      TableName: this.tableName,
      Key: { id: updateJackpotLookupDto.id },
      UpdateExpression:
        'set total_prize = :total_prize, number_of_winners = :number_of_winners, prize_per_winner = :prize_per_winner, total_prize_with_fee = :total_prize_with_fee',
      ExpressionAttributeValues: {
        ':total_prize': updateJackpotLookupDto.total_prize,
        ':number_of_winners': updateJackpotLookupDto.number_of_winners,
        ':prize_per_winner': updateJackpotLookupDto.prize_per_winner,
        ':total_prize_with_fee': updateJackpotLookupDto.total_prize_with_fee,
      },
      ReturnValues: 'UPDATED_NEW' as const,
    };

    try {
      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('Error updating item:', error);
      throw new Error('Failed to update the item');
    }
  }

  async deleteLookupRecordById(id: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      Key: { id: id },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }
}
