/* eslint-disable prettier/prettier */
import { DynamoDBClient, ReturnValue } from '@aws-sdk/client-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { CognitoService } from 'src/auth/cognito.service';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { v4 as uuidv4 } from 'uuid';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { UpdateWalletBalanceDto } from './dto/update-wallet-balance.dto';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { StripeService } from 'src/stripe/stripe.service';
import { PlayerService } from 'src/player/player.service';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    private readonly cognitoService: CognitoService,
    private readonly stripeService: StripeService,
    private readonly playerService: PlayerService,
  ) {
    this.tableName = DynamoTables.Wallets;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'user_id';
  }


  async validateAndCreateWallet(
    authUser: any,
    createwalletDto: CreateWalletDto,
  ) {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }

    // Generate a unique wallet ID
    let generatedId = uuidv4();
    while (await this.getWalletById(generatedId)) {
      generatedId = uuidv4();
    }

    // check id exist
    const isIDExists = await this.dynamoService.isIdExist(
      authUser.user_id,
      this.getTablePK(),
      this.getTableName(),
    );
    if (isIDExists) {
      throw new Error('You already have a valid wallet');
    }

    // Save the wallet to the database
    const stripe_id = await this.stripeService.createStripeCustomer({ user_id: authUser.user_id, wallet_id: generatedId, email: cognitoUser.UserAttributes.find((attr) => attr.Name === 'email').Value });

    // Create the wallet object
    const insertOfferDto = {
      user_id: authUser.user_id,
      wallet_id: generatedId,
      stripe_id,
      ...createwalletDto,
    };


    return await this.createWallet(insertOfferDto);
  }

  async createWallet(createwalletDto: CreateWalletDto): Promise<any> {
    const params = {
      TableName: this.tableName,
      Item: createwalletDto,
    };

    try {
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error inserting item:', error);
      throw new Error('Error creating Wallet');
    }
  }

  async getWalletById(walletId: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      FilterExpression: 'wallet_id = :walletId',
      ExpressionAttributeValues: {
        ':walletId': walletId,
      },
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items ? result.Items[0] : null;
    } catch (error) {
      throw new Error(
        `Could not fetch wallet with walletId ${walletId}: ${error.message}`,
      );
    }
  }

  async getWalletsByType(type: string): Promise<any> {
    const params = {
      TableName: DynamoTables.Wallets,
      IndexName: 'wallet-type-index',
      KeyConditionExpression: '#type = :typeValue',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':typeValue': type,
      },
    };

    try {
      const data = await this.dynamoDb.send(new QueryCommand(params));
      return data.Items;
    } catch (err) {
      console.error('Query failed:', err);
      throw err;
    }
  };

  async getWalletByUserId(authUser: any): Promise<CreateWalletDto> {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }
    // process
    const params = {
      TableName: this.tableName,
      Key: {
        user_id: authUser.user_id,
      },
    };

    try {
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item as CreateWalletDto;
    } catch (error) {
      throw new Error(
        `Could not fetch wallet for userId ${authUser.user_id}: ${error.message}`,
      );
    }
  }

  async getAllWallets(): Promise<any> {
    const params = {
      TableName: this.tableName,
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items;
    } catch (error) {
      throw new Error(`Could not fetch wallets: ${error.message}`);
    }
  }

  async updateWallet(
    authUser: any,
    updateWalletDto: UpdateWalletDto,
  ): Promise<any> {
    try {
      // Check if the user exists in Cognito
      const cognitoUser = await this.cognitoService.checkIfUserExists(
        authUser.user_id,
      );
      if (!cognitoUser) {
        throw new Error('You do not have a valid account');
      }

      const currentDetails = {
        ...updateWalletDto,
        user_id: authUser.user_id,
      };

      const { user_id, ...rest } = currentDetails;

      const params = updateParamsGenerator({ user_id }, rest, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      throw new Error('Failed to delete update wallet');
    }
  }

  async deleteWalletByUserId(authUser: any): Promise<any> {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }
    // process
    const params = {
      TableName: this.tableName,
      Key: { user_id: authUser.user_id },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }

  async updateWalletBalance(
    authUser: any,
    updateWalletBalanceDto: UpdateWalletBalanceDto,
  ): Promise<any> {
    try {
      const walletDetails = await this.getWalletByUserId(authUser);
      const walletTempBalance = this.calculateWalletTempBalance(walletDetails, updateWalletBalanceDto);

      if (!walletTempBalance) {
        throw new Error('Invalid coin_type');
      }

      if (updateWalletBalanceDto.referral_earnings) {
        walletTempBalance.referral_earnings = walletDetails.referral_earnings + updateWalletBalanceDto.amount;
      }

      const currentDetails = {
        ...walletTempBalance,
        user_id: authUser.user_id,
      };

      const params = this.buildUpdateParams(currentDetails);
      const result = await this.dynamoDb.send(new UpdateCommand(params));

      return result.Attributes;
    } catch (error) {
      throw new Error('Failed to update wallet: ' + error.message);
    }
  }

  private calculateWalletTempBalance(walletDetails: any, dto: UpdateWalletBalanceDto) {
    const { coin_type, tx_operation, amount } = dto;
    const balanceKey = this.getBalanceKey(coin_type);

    if (!balanceKey) {
      return null;
    }

    const balance = walletDetails[balanceKey];
    const tempRate = balance === 0 ? 0 : (100 * amount) / balance;
    const newBalance = tx_operation === 'Add' ? balance + amount : balance - amount;

    return {
      [`balance_${coin_type.toLowerCase()}`]: newBalance,
      [`rate_${coin_type.toLowerCase()}`]: `${tx_operation === 'Add' ? '+' : '-'}${tempRate.toFixed(2)}%`,
      updated_date: new Date().toISOString(),
    };
  }

  private getBalanceKey(coinType: string) {
    switch (coinType) {
      case 'LC':
        return 'balance_lc';
      case 'Dollar':
        return 'balance_dollar';
      default:
        return null;
    }
  }

  private buildUpdateParams(details: any) {
    let updateExpression = 'set';
    const ExpressionAttributeNames: any = {};
    const ExpressionAttributeValues: any = {};

    const { user_id, ...rest } = details;

    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== null) {
        updateExpression += ` #${key} = :${key},`;
        ExpressionAttributeNames[`#${key}`] = key;
        ExpressionAttributeValues[`:${key}`] = value;
      }
    }

    // Remove the trailing comma from the update expression
    updateExpression = updateExpression.slice(0, -1);

    return {
      TableName: this.tableName,
      Key: { user_id: user_id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: ReturnValue.ALL_NEW, // Return all the attributes of the updated item
    };
  }
}
