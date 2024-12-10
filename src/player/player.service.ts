/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { CognitoService } from 'src/auth/cognito.service';
import { InsertPlayerDto } from './dto/insert-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { AttributeValue, DynamoDBClient, TransactWriteItemsCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { PlayerDto } from './dto/player.dto';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';
import { getCountBetweenDates, getTotalCount } from 'src/common/utils/dynamo.querry.utility';
import { DateFilterDto } from 'src/admin/dashboard/dto/date-filter.dto';
import * as moment from 'moment';
import { CopyObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { AppConfigService } from 'src/config/config.service';
import { UpdateUserDto } from 'src/admin/users/dto/update-user.dto';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;
  private readonly s3Client: S3Client;

  private readonly luckyHandAssets = 'luckyhand-assets';
  private readonly profileImageFolder = 'userPicture/';
  private readonly region = 'ap-northeast-2';

  constructor(
    private readonly dynamoService: DynamoService,
    private readonly cognitoService: CognitoService,
    private readonly configService: AppConfigService
  ) {
    this.tableName = DynamoTables.Users;
    this.dynamoDb = dynamoService.getClient();

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.accessKeyId,
        secretAccessKey: this.configService.secretAccessKey,
      },
    });
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'user_id';
  }

  async getPlayerDetails(playerDto: PlayerDto): Promise<any> {
    try {
      const params = {
        TableName: this.tableName,
        Key: { user_id: playerDto.user_id },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getTodaysAndYesterdaysPlayersCount(): Promise<any> {

    const startOfMonth = moment().startOf('month').toISOString();  // Start of the month in ISO format
    const currentLiveDate = moment().toISOString();

    const additionalFilter = ``;

    const additionalExpressionAttributeValues = {};

    try {

      const monthCount = await getCountBetweenDates(
        {
          startDate: startOfMonth,
          endDate: currentLiveDate,
          tableName: this.tableName,
          attributeName: 'created_date',
          additionalFilterExpression: additionalFilter,
          additionalExpressionAttributeValues,
          additionalExpressionAttributeNames: {},
        },
        this.dynamoDb,
      );

      const totalCount = await getTotalCount(this.tableName, additionalFilter, additionalExpressionAttributeValues, {}, this.dynamoDb);

      return {
        monthCount,
        totalCount
      };

    } catch (error) {

      console.error("Error querying DynamoDB:", error);
      throw error;

    }
  }


  async getPlayerDetailsById(user_id: string): Promise<any> {
    try {
      const params = {
        TableName: this.tableName,
        Key: { user_id },
      };
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async insertPlayerDetails(insertPlayerDto: InsertPlayerDto): Promise<any> {
    try {
      const params = {
        TableName: this.tableName,
        Item: insertPlayerDto,
      };
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async getPlayersByTimeFrame(dateFilterDto: DateFilterDto, expression: string): Promise<any> {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: "(#date BETWEEN :startDate AND :endDate)",
        ExpressionAttributeNames:
        {
          "#date": expression,
        }
        ,
        ExpressionAttributeValues: {
          ":startDate": dateFilterDto.startDate,
          ":endDate": dateFilterDto.endDate,
        },
      };
      const { Items } = await this.dynamoDb.send(
        new ScanCommand(params),
      );
      return Items;
    } catch (error) {
      throw new Error('Failed to query the getAllGames');
    }
  }

  async getAllPlayers(): Promise<any> {
    const params = {
      TableName: this.tableName,
    };

    try {

      const { Items } = await this.dynamoDb.send(new ScanCommand(params));

      return Items;
    } catch (error) {
      console.error("Error fetching players from DynamoDB:", error);
      throw error;
    }
  }

  async updateUser(playerDto: PlayerDto, updateUserDto: UpdateUserDto): Promise<any> {
    // get player from cognito

    try {

      const params = updateParamsGenerator({ user_id: playerDto.user_id }, updateUserDto, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async updatePlayer(playerDto: PlayerDto, updatePlayerDto: UpdatePlayerDto): Promise<any> {
    // get player from cognito

    try {

      const params = updateParamsGenerator({ user_id: playerDto.user_id }, updatePlayerDto, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async deletePlayer(userID: string): Promise<any> {
    console.log('service', userID);
    const params = {
      TableName: this.tableName,
      Key: { user_id: userID },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }

  async images(): Promise<any> {

    try {

      const command = new ListObjectsV2Command({
        Bucket: this.luckyHandAssets,
        Prefix: this.profileImageFolder,
      });

      const response = await this.s3Client.send(command);
      const url = `https://${this.luckyHandAssets}.s3.${this.region}.amazonaws.com/`;

      return { url, profileImageUrl: url + "userProfileImage/", images: response.Contents.slice(1) };

    } catch (error) {
      console.error('Error fetching image names:', error);
      throw new Error('Error fetching image names:');
    }
  }

  async copyAndRenameImage(image_url, user_id): Promise<void> {
    try {

      const params = {
        Bucket: this.luckyHandAssets,
        CopySource: `${this.luckyHandAssets}/${image_url}`,
        Key: `userProfileImage/${user_id}.png`,
      };

      // Copy the object
      await this.s3Client.send(new CopyObjectCommand(params));

    } catch (error) {
      console.error("Error copying and renaming image:", error);
    }
  }



  async updatePlayerGameStatuses(updates: Array<{ userId: string; lastGameDate?: boolean; incrementGames?: number; decrementGames?: number, incrementWins?: number, incrementLoss?: number, incrementDraws?: number }>): Promise<void> {

    const transactItems = updates.map(update => {
      const expressionAttributeValues: Record<string, AttributeValue> = {};
      let updateExpression = 'SET ';

      if (update.lastGameDate) {
        updateExpression += 'last_game_date = :lastGameDate, ';
        expressionAttributeValues[':lastGameDate'] = { S: new Date().toISOString() };
      }

      if (update.incrementGames !== undefined) {
        updateExpression += 'number_of_games = number_of_games + :incrementGames, ';
        expressionAttributeValues[':incrementGames'] = { N: update.incrementGames.toString() };
      }

      if (update.decrementGames !== undefined) {
        updateExpression += 'number_of_games = number_of_games - :decrementGames, ';
        expressionAttributeValues[':decrementGames'] = { N: update.decrementGames.toString() };
      }

      if (update.incrementWins !== undefined) {
        updateExpression += 'total_of_wins = total_of_wins + :incrementWins, ';
        expressionAttributeValues[':incrementWins'] = { N: update.incrementWins.toString() };
      }

      if (update.incrementLoss !== undefined) {
        updateExpression += 'total_of_loss = total_of_loss + :incrementLoss, ';
        expressionAttributeValues[':incrementLoss'] = { N: update.incrementLoss.toString() };
      }

      if (update.incrementDraws !== undefined) {
        updateExpression += 'total_of_draws = total_of_draws + :incrementDraws, ';
        expressionAttributeValues[':incrementDraws'] = { N: update.incrementDraws.toString() };
      }

      // Remove trailing comma and space from updateExpression
      updateExpression = updateExpression.trim().replace(/,$/, '');

      if (Object.keys(expressionAttributeValues).length === 0) {
        throw new Error(`No valid updates provided for userId: ${update.userId}`);
      }

      return {
        Update: {
          TableName: this.tableName,
          Key: {
            user_id: { S: update.userId },
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'UPDATED_NEW',
        },
      };
    });

    // Prepare the params for the transaction
    const params = {
      TransactItems: transactItems,
    };

    try {
      // Send the transact write command to DynamoDB
      await this.dynamoDb.send(new TransactWriteItemsCommand(params));
    } catch (err) {
      console.error("Error updating player statuses:", err);
      throw new Error(`Failed to update player statuses: ${err.message}`);
    }
  }

  async getUserByUid(uid: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'UidIndex',
      KeyConditionExpression: 'uid = :uid',
      ExpressionAttributeValues: {
        ':uid': uid,
      },
    };

    try {
      const { Items: [res = null] } = await this.dynamoDb.send(new QueryCommand(params));

      return res;
    } catch (error) {
      console.error('Error querying uid:', error);
      throw new Error('Failed to query the uid');
    }
  }

  async getUsersByUid(uid: Array<string>): Promise<any> {

    const uidValues = {};
    const uidPlaceholders = [];

    // Build ExpressionAttributeValues and FilterExpression dynamically based on statuses
    uid.forEach((uid, index) => {
      const placeholder = `:uid${index}`;
      uidValues[placeholder] = uid;
      uidPlaceholders.push(placeholder);
    });

    // Start with the base FilterExpression
    const filterExpression = `#uid IN (${uidPlaceholders.join(', ')})`;

    // Build the params object
    const params: any = {
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: {
        ...(uid.length > 0 ? uidValues : {}),
      },
      ExpressionAttributeNames: {
        '#uid': 'uid'
      }
    };

    try {
      const { Items } = await this.dynamoDb.send(new ScanCommand(params));
      return Items;
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error('Failed to scan the table');
    }
  }

  async updateDirectReferrals(userId: string, new_referral: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      Key: { user_id: { S: userId } },
      UpdateExpression:
        "SET direct_referrals = list_append(if_not_exists(direct_referrals, :empty_list), :new_referral)",
      ExpressionAttributeValues: {
        ":new_referral": { L: [{ S: new_referral }] },
        ":empty_list": { L: [] },
      },
    };

    try {
      const result = await this.dynamoDb.send(new UpdateItemCommand(params));
      return result;
    } catch (error) {
      console.error("Error updating direct referrals:", error);
      throw error;
    }
  }

}

