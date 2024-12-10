/* eslint-disable prettier/prettier */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiDto } from './dto/ai.dto';
import { InsertAiDto } from './dto/insert-ai.dto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { REQUEST } from '@nestjs/core';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { GetAiByPlanIdDto } from './dto/get-ai-by-plan-id.dto';
import { GetAiByDateDto } from './dto/get-ai-by-date.dto';
import { UpdateAiDto } from './dto/update-ai.dto';
import { generateUniqueSubId, updateParamsGenerator } from 'src/common/utils/util-functions.utility';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    @Inject(REQUEST) private readonly request: UserRequest,
  ) {
    this.tableName = DynamoTables.UserAIs;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'user_id';
  }

  getTableSK(): string {
    return 'id';
  }

  public getUserDetails(): IUser {
    return this.request.user;
  }

  async getAiById(AiDto: AiDto): Promise<any> {
    try {
      const { id, user_id } = AiDto;
      const params = {
        TableName: this.tableName,
        Key: { user_id: user_id, id: id },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async queryAiById(UpdateAiDto: UpdateAiDto): Promise<any> {
    try {
      const { id, user_id, date } = UpdateAiDto;
      const params = {
        TableName: this.tableName,
        KeyConditionExpression: "#userId = :userId AND #id = :id",
        FilterExpression: "#date = :dateValue",
        ExpressionAttributeValues: {
          ":userId": user_id,
          ":id": id,
          ":dateValue": date
        },
        ExpressionAttributeNames: {
          "#userId": "user_id",
          "#id": "id",
          "#date": "date"
        },
      };

      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getAiByPlanId(getAiByPlanIdDto: GetAiByPlanIdDto): Promise<any> {
    try {
      const { plan_id, user_id, date } = getAiByPlanIdDto;

      const params = {
        TableName: this.tableName,
        IndexName: "UserAIsPlanIndex",
        KeyConditionExpression: "#planId = :planId AND #userId = :userId",
        FilterExpression: "#date = :dateValue",
        ExpressionAttributeValues: {
          ":planId": plan_id,
          ":userId": user_id,
          ":dateValue": date
        },
        ExpressionAttributeNames: {
          "#planId": "plan_id",
          "#userId": "user_id",
          "#date": "date"
        },
      };

      const command = new QueryCommand(params);
      const data = await this.dynamoDb.send(command);
      return data.Items;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getAllAiByPlanId(getAiByPlanIdDto: GetAiByPlanIdDto): Promise<any> {
    try {
      const { plan_id, user_id } = getAiByPlanIdDto;

      const params = {
        TableName: this.tableName,
        IndexName: "UserAIsPlanIndex",
        KeyConditionExpression: "#planId = :planId AND #userId = :userId",
        FilterExpression: "#plan_action_source <> :plan_action_sourceValue",
        ExpressionAttributeValues: {
          ":planId": plan_id,
          ":userId": user_id,
          ":plan_action_sourceValue": "null"
        },
        ExpressionAttributeNames: {
          "#planId": "plan_id",
          "#userId": "user_id",
          "#plan_action_source": "plan_action_source"
        },
      };

      const command = new QueryCommand(params);
      const data = await this.dynamoDb.send(command);
      return data.Items;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getAiByDate(getAiByDateDto: GetAiByDateDto): Promise<any> {
    try {
      const { user_id, date } = getAiByDateDto;

      const params = {
        TableName: this.tableName,
        IndexName: "UserAIsDateIndex",
        KeyConditionExpression: "#date = :dateValue AND #userId = :userId",
        ExpressionAttributeNames: {
          "#date": "date",
          "#userId": "user_id"
        },
        ExpressionAttributeValues: {
          ":dateValue": date,
          ":userId": user_id,
        },
        ScanIndexForward: true,
      };

      const command = new QueryCommand(params);
      const data = await this.dynamoDb.send(command);
      return data.Items;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async createAi(insertAiDto: InsertAiDto) {
    try {
      const params = {
        TableName: this.tableName,
        Item: insertAiDto,
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

  async updateAi(insertAiDto: InsertAiDto) {
    try {

      const { id, user_id, ...rest } = insertAiDto;

      const params = updateParamsGenerator({ user_id, id }, rest, this.tableName);
      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async deleteAi(AiDto: AiDto) {
    const params = {
      TableName: this.tableName,
      Key: {
        user_id: AiDto.user_id,
        id: AiDto.id,
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
