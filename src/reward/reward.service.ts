/* eslint-disable prettier/prettier */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateRewardDto } from './dto/create-reward.dto'; // DTO name updated
import { UpdateRewardDto } from './dto/update-reward.dto'; // DTO name updated
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoService } from 'src/dynamo/dynamo.service';
import {
  IUser,
  UserRequest,
} from 'src/common/interfaces/user-request.interface';
import { REQUEST } from '@nestjs/core';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import { v4 as uuidv4 } from 'uuid';
import { GetRewardByIdDto } from './dto/get-reward-by-id.dto';
import { GetAllRewardDto } from './dto/get-all-reward.dto';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    @Inject(REQUEST) private readonly request: UserRequest,
  ) {
    this.tableName = DynamoTables.UserRewards;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'user_id';
  }

  getTableSK(): string {
    return 'reward_id';
  }

  public getUserDetails(): IUser {
    return this.request.user;
  }

  async getRewardById(getRewardByIdDto: GetRewardByIdDto): Promise<any> {
    // Method name updated
    try {
      const { reward_id, user_id } = getRewardByIdDto;
      const params = {
        TableName: this.tableName,
        Key: { user_id: user_id, reward_id: reward_id },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getAllRewards(getAllRewardsDto: GetAllRewardDto): Promise<any> {
    // Method name updated
    try {
      let allRewards = [];
      const lastEvaluatedKey = getAllRewardsDto.lastEvaluatedKey;
      const limit = getAllRewardsDto.limit;
      do {
        const params = {
          TableName: this.tableName,
          KeyConditionExpression: '#uid = :uid',
          ExpressionAttributeNames: {
            '#uid': 'user_id',
          },
          ExpressionAttributeValues: {
            ':uid': getAllRewardsDto.user_id,
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
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async createReward(createRewardDto: CreateRewardDto) {
    // Method name updated
    try {
      const params = {
        TableName: this.tableName,
        Item: createRewardDto,
      };
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async generateUniqueRewardId(tablePKValue: string): Promise<string | Error> {
    // Method name updated
    try {
      let generatedId = uuidv4();
      while (
        await this.dynamoService.isSubIdExist(
          tablePKValue,
          this.getTablePK(),
          generatedId,
          this.getTableSK(),
          this.getTableName(),
        )
      ) {
        generatedId = uuidv4();
      }

      return generatedId;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async updateReward(
    getRewardByIdDto: GetRewardByIdDto,
    updateRewardDto: UpdateRewardDto,
  ) {
    try {

      const { user_id, reward_id } = getRewardByIdDto;

      const params = updateParamsGenerator({ user_id, reward_id }, updateRewardDto, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

}
