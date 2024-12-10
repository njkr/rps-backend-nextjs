/* eslint-disable prettier/prettier */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { REQUEST } from '@nestjs/core';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { LcDto } from './dto/lc.dto';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { GetAllLcDto } from './dto/get-all-lc.dto';
import { UpdateInsertLcDto } from './dto/update-insert-lc.dto';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { generateUniqueSubId, updateParamsGenerator } from 'src/common/utils/util-functions.utility';

@Injectable()
export class LcService {
  private readonly logger = new Logger(LcService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    @Inject(REQUEST) private readonly request: UserRequest,
  ) {
    this.tableName = DynamoTables.UserLCoins;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'user_id';
  }

  getTableSK(): string {
    return 'lc_id';
  }

  public getUserDetails(): IUser {
    return this.request.user;
  }

  async getLcById(playerLcDto: LcDto): Promise<any> {
    try {
      const { lc_id, user_id } = playerLcDto;
      const params = {
        TableName: this.tableName,
        Key: { user_id: user_id, lc_id: lc_id },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error get player lc by id', error);
      throw error;
    }
  }

  async getAllLcById(getAllLcDto: GetAllLcDto): Promise<any> {
    try {
      let allRewards = [];
      const lastEvaluatedKey = getAllLcDto.lastEvaluatedKey;
      const limit = getAllLcDto.limit;
      do {
        const params = {
          TableName: this.tableName,
          KeyConditionExpression: '#uid = :uid',
          ExpressionAttributeNames: {
            '#uid': 'user_id',
          },
          ExpressionAttributeValues: {
            ':uid': getAllLcDto.user_id,
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
        allRewards = [...allRewards, ...Items];

      } while (lastEvaluatedKey);

      return allRewards;
    } catch (error) {
      console.error('Error get all player lc by id', error);
      throw error;
    }
  }

  async createLc(playerLcDto: LcDto, updateInsertLcDto: UpdateInsertLcDto) {
    try {
      const params = {
        TableName: this.tableName,
        Item: { ...playerLcDto, ...updateInsertLcDto },
      };
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error create player lc', error);
      throw error;
    }
  }

  async generateUniqueId(tablePKValue: string): Promise<string> {
    return await generateUniqueSubId(tablePKValue, this.getTablePK(), this.getTableSK(), this.getTableName(), this.dynamoService);
  }

  async updateLc(playerLcDto: LcDto, updateInsertLcDto: UpdateInsertLcDto) {
    try {

      const { user_id, lc_id } = playerLcDto;

      const params = updateParamsGenerator({ user_id, lc_id }, updateInsertLcDto, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('Error update player lc', error);
      throw error;
    }
  }

  async deleteLc(playerLcDto: LcDto) {
    const params = {
      TableName: this.tableName,
      Key: {
        user_id: playerLcDto.user_id,
        lc_id: playerLcDto.lc_id,
      },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error delete player lc', error);
      throw new Error('Failed to delete the item');
    }
  }
}
