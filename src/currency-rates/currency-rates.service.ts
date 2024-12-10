import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { v4 as uuidv4 } from 'uuid';
import { InsertCurrencyRateDto } from './dto/insert-currency-rate-dto';
import {
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { UpdateCurrencyRateDto } from './dto/update-currency-rate-dto';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';

@Injectable()
export class CurrencyRatesService {
  private readonly logger = new Logger(CurrencyRatesService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoService) {
    this.tableName = DynamoTables.CurrencyRates;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return DynamoTables.CurrencyRates;
  }

  getTablePK(): string {
    return 'id';
  }

  async generateUniqueId(): Promise<string> {
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
  }

  async getAll(): Promise<any> {
    const params = {
      TableName: this.tableName,
    };

    try {
      const { Items } = await this.dynamoDb.send(new ScanCommand(params));

      return Items;
    } catch (error) {
      console.error('error getting currencies', error);
      throw new Error('error getting currencies');
    }
  }

  async getByCurrency(currency: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'CurrencyIndex',
      KeyConditionExpression: 'currency = :currency',
      ExpressionAttributeValues: {
        ':currency': currency,
      },
    };

    try {
      const { Items } = await this.dynamoDb.send(new QueryCommand(params));

      return Items;
    } catch (error) {
      console.error('Error querying CurrencyIndex:', error);
      throw new Error('Failed to query the CurrencyIndex');
    }
  }

  async insert(insertCurrencyRateDto: InsertCurrencyRateDto): Promise<any> {
    try {
      const [currencyData] = await this.getByCurrency(
        insertCurrencyRateDto.currency,
      );

      if (currencyData) {
        throw new Error('Currency already exists please update the currency');
      }

      const id = await this.generateUniqueId();
      const params = {
        TableName: this.tableName,
        Item: { ...insertCurrencyRateDto, id },
      };
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error querying CurrencyIndex:', error);
      throw new Error('Failed to query the CurrencyIndex');
    }
  }

  async update(updateCurrencyRateDto: UpdateCurrencyRateDto): Promise<any> {
    try {
      const { id, ...rest } = updateCurrencyRateDto;

      const params = updateParamsGenerator({ id }, rest, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result;
    } catch (error) {
      console.error('Error querying CurrencyIndex:', error);
      throw new Error('Failed to query the CurrencyIndex');
    }
  }
}
