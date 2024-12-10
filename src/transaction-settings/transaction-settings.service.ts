import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { DynamoService } from 'src/dynamo/dynamo.service';

@Injectable()
export class TransactionSettingsService {
  private readonly logger = new Logger(TransactionSettingsService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoService) {
    this.tableName = DynamoTables.TransactionSettings;
    this.dynamoDb = this.dynamoService.getClient();
  }

  async getActiveTransactionSettings(): Promise<any> {
    const params = {
      TableName: this.tableName,
      FilterExpression: 'is_active = :is_active',
      ExpressionAttributeValues: {
        ':is_active': 'true',
      },
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items?.[0] ?? null;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }
}
