/* eslint-disable prettier/prettier */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { CreateCompanyWalletDto } from './dto/create-company-wallet.dto';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateCompanyWalletDto } from './dto/update-company-wallet.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoService) {
    this.tableName = 'RPS_CompanyWallet';
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'id';
  }

  async createCompanyWallet(
    createcompanyWalletDto: CreateCompanyWalletDto,
  ): Promise<any> {
    const params = {
      TableName: this.tableName,
      Item: createcompanyWalletDto,
    };

    try {
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error inserting item:', error);
      throw new Error('Error creating company wallet');
    }
  }

  async getCompanyWalletRowById(id: string): Promise<any> {
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

  async getCompanyWalletByCoinTypeAndSource(
    coinType: string,
    source: string,
  ): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'CoinTypeSourceIndex',
      KeyConditionExpression: 'coin_type = :coinType and #source = :source',
      ExpressionAttributeValues: {
        ':coinType': coinType,
        ':source': source,
      },
      ExpressionAttributeNames: {
        '#source': 'source',
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

  async getAllCompanyWallets(): Promise<any> {
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

  async updateCompanyWallet(
    updatecompanyWalletDto: UpdateCompanyWalletDto,
  ): Promise<any> {
    const params = {
      TableName: this.tableName,
      Key: { id: updatecompanyWalletDto.id },
      UpdateExpression:
        'set amount = :amount, coin_type = :coin_type, source_id = :sourceId, #source = :source, updated_date = :updated_date ',
      ExpressionAttributeValues: {
        ':amount': updatecompanyWalletDto.amount,
        ':coin_type': updatecompanyWalletDto.coin_type,
        ':sourceId': updatecompanyWalletDto.source_id,
        ':source': updatecompanyWalletDto.source,
        ':updated_date': new Date().toISOString(),
      },
      ExpressionAttributeNames: {
        '#source': 'source',
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

  async deleteCompanyWalletById(id: string): Promise<any> {
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
