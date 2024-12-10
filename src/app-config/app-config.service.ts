import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Injectable } from '@nestjs/common';
import { Logger } from 'ethers/lib/utils';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { DynamoService } from 'src/dynamo/dynamo.service';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoService) {
    this.tableName = DynamoTables.AppConfig;
    this.dynamoDb = this.dynamoService.getClient();
  }

  async getAppConfig() {
    const params = {
      TableName: this.tableName,
    };

    try {
      const {
        Items: [result = null],
      } = await this.dynamoDb.send(new ScanCommand(params));
      return result;
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this recoed deos not exist');
    }
  }
}
