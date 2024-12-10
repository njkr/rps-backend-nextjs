/* eslint-disable prettier/prettier */
import { DynamoDBClient, ReturnValue } from '@aws-sdk/client-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { CognitoService } from 'src/auth/cognito.service';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { WalletService } from 'src/wallet/wallet.service';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { GetTransactionsSourceDto } from './dto/get-transactions-source.dto';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';
import { DateFilterDto } from 'src/admin/dashboard/dto/date-filter.dto';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(
    private readonly walletService: WalletService,
    private readonly dynamoService: DynamoService,
    private readonly cognitoService: CognitoService,
  ) {
    this.tableName = DynamoTables.Transactions;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'user_id';
  }

  getTableSK(): string {
    return 'tx_id';
  }

  async generateUniqueId(user_id: string): Promise<string> {
    try {


      let generatedId = uuidv4();

      while (await this.dynamoService.isSubIdExist(user_id,
        this.getTablePK(),
        generatedId,
        this.getTableSK(),
        this.getTableName(),)) {
        generatedId = uuidv4();
      }

      return generatedId;

    } catch (error) {

      throw new Error(error);

    }
  }

  async getTransactionAmountByTimeFrame(startDate: string, endDate: string, tx_type: string[], tx_operation: string, coin_type: string): Promise<any> {

    // Create dynamic placeholders for tx_type
    const txTypePlaceholders = tx_type.map((_, index) => `:txType${index}`).join(", ");

    // Create ExpressionAttributeValues for tx_type dynamically
    const txTypeValues = tx_type.reduce((acc, type, index) => {
      acc[`:txType${index}`] = type;
      return acc;
    }, {});

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: "(#date BETWEEN :startDate AND :endDate) AND (#coin_type = :coin_type) AND (#tx_operation = :tx_operation) AND (#tx_type IN (" + txTypePlaceholders + "))",
      ExpressionAttributeNames: {
        "#date": 'date',
        "#tx_type": 'tx_type',
        "#coin_type": 'coin_type',
        "#tx_operation": 'tx_operation'
      },
      ExpressionAttributeValues: {
        ":startDate": startDate,
        ":endDate": endDate,
        ":coin_type": coin_type,
        ":tx_operation": tx_operation,
        ...txTypeValues, // Dynamically added tx_type values
      },
    });

    try {
      const result = await this.dynamoDb.send(command);
      return result.Items;
    } catch (error) {
      throw new Error(`Error fetching transaction amounts`);
    }
  }

  async getTransactionByTimeFrame(dateFilterDto: DateFilterDto): Promise<any> {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: "(#date BETWEEN :startDate AND :endDate)",
        ExpressionAttributeNames:
        {
          "#date": 'date',
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
      throw new Error('Failed to query the transaction');
    }
  }

  async getTodayAndYesterdayTransaction(): Promise<any> {
    try {

      const [companyWallet] =
        await this.walletService.getWalletsByType('Company');

      const { balance_dollar, balance_lc, rate_lc, rate_dollar } = companyWallet;


      return {
        totalRevenueDollar: {
          totalAmount: balance_dollar,
          rate: rate_dollar,
        },
        totalRevenueLc: {
          totalAmount: balance_lc,
          rate: rate_lc,
        }
      }

    } catch (error) {
      throw new Error(`Error fetching transaction amounts`);
    }
  }


  async validateAndCreateTransaction(
    authUser: any,
    createTransactionDto: CreateTransactionDto
  ) {

    const currentWallet: any = await this.walletService.getWalletByUserId(authUser);
    if (!currentWallet) {
      throw new Error('You do not have a valid Wallet');
    }

    // Generate a unique transaction ID
    const { user_id } = authUser;
    const generatedId = await this.generateUniqueId(user_id);

    let updated_amount = 0;
    if (createTransactionDto.coin_type === 'Dollar') {
      if (
        createTransactionDto.tx_operation === 'Remove' &&
        currentWallet.balance_dollar < createTransactionDto.amount
      ) {
        throw new Error('You do not have enough money');
      }
      updated_amount =
        createTransactionDto.tx_operation === 'Add'
          ? currentWallet.balance_dollar + createTransactionDto.amount
          : currentWallet.balance_dollar - createTransactionDto.amount;
    }
    if (createTransactionDto.coin_type === 'LC') {
      if (
        createTransactionDto.tx_operation === 'Remove' &&
        currentWallet.balance_lc < createTransactionDto.amount
      ) {
        throw new Error('You do not have enough money');
      }
      updated_amount =
        createTransactionDto.tx_operation === 'Add'
          ? currentWallet.balance_lc + createTransactionDto.amount
          : currentWallet.balance_lc - createTransactionDto.amount;
    }
    // Create the transaction object
    const insertOfferDto = {
      user_id: authUser.user_id,
      tx_id: generatedId,
      updated_balance: updated_amount,
      ...createTransactionDto,
    };

    // Save the transaction to the database
    const data = await this.createTransaction(insertOfferDto);
    this.walletService.updateWalletBalance(authUser, {
      amount: createTransactionDto.amount,
      tx_operation: createTransactionDto.tx_operation,
      coin_type: createTransactionDto.coin_type,
      referral_earnings: createTransactionDto.referral_earnings,
      user_id: authUser.user_id,
    });
    return data;
  }

  async validateAndCreateTransactionWithFees(
    authUser: any,
    createTransactionDto: CreateTransactionDto,
  ) {

    const currentWallet: any = await this.walletService.getWalletByUserId(authUser);
    if (!currentWallet) {
      throw new Error('You do not have a valid Wallet');
    }

    // Generate a unique transaction ID
    const { user_id } = authUser;
    const generatedId = await this.generateUniqueId(user_id);

    // Initialize variables for balance checks
    const [newBalanceDollar, newBalanceLC] = this.validateAndGenerateBalance(currentWallet, createTransactionDto);

    // Create the transaction object
    const insertOfferDto = {
      user_id: authUser.user_id,
      tx_id: generatedId,
      updated_balance: createTransactionDto.coin_type === 'Dollar' ? newBalanceDollar : newBalanceLC,
      ...createTransactionDto,
    };

    // Save the transaction to the database
    const data = await this.createTransaction(insertOfferDto);
    await this.walletService.updateWallet(authUser, {
      balance_dollar: newBalanceDollar,
      balance_lc: newBalanceLC,
      user_id: authUser.user_id,
    });
    return data;
  }

  validateHasBalance(amount: number, transactionAmount: number, message: string): boolean {
    if (amount <= transactionAmount) {
      throw new Error(message);
    }
    return true;
  }

  validateAndGenerateBalance(currentWallet, createTransactionDto): Array<any> {
    let newBalanceDollar = currentWallet.balance_dollar;
    let newBalanceLC = currentWallet.balance_lc;

    if (createTransactionDto.tx_operation === 'Remove') {

      switch (createTransactionDto.tx_fee_coin_type) {
        case 'Dollar':
          this.validateHasBalance(newBalanceDollar, createTransactionDto.tx_fee, "Insufficient Dollar balance for fee.");
          newBalanceDollar -= createTransactionDto.tx_fee;
          break;
        case 'LC':
          this.validateHasBalance(newBalanceLC, createTransactionDto.tx_fee, "Insufficient LC balance for fee.");
          newBalanceLC -= createTransactionDto.tx_fee;
          break;
      }

      switch (createTransactionDto.coin_type) {

        case 'Dollar':
          this.validateHasBalance(newBalanceDollar, createTransactionDto.amount, "Insufficient Dollar balance for amount.");
          newBalanceDollar -= createTransactionDto.amount;
          break;
        case 'LC':
          this.validateHasBalance(newBalanceLC, createTransactionDto.amount, "Insufficient LC balance for amount.");
          newBalanceLC -= createTransactionDto.amount;
          break;

      }
    } else if (createTransactionDto.tx_operation === 'Add') {

      switch (createTransactionDto.coin_type) {
        case 'Dollar':
          newBalanceDollar += createTransactionDto.amount;
          break;
        case 'LC':
          newBalanceLC += createTransactionDto.amount;
          break;
      }

      switch (createTransactionDto.tx_fee_coin_type) {
        case 'Dollar':
          newBalanceDollar += createTransactionDto.tx_fee;
          break;
        case 'LC':
          newBalanceLC += createTransactionDto.tx_fee;
          break;
      }

    }

    return [newBalanceDollar, newBalanceLC];
  }

  async revertTransaction(
    authUser: any,
    createTransactionDto: CreateTransactionDto,
  ) {

    try {

      const currentWallet: any = await this.walletService.getWalletByUserId(authUser);
      if (!currentWallet) {
        throw new Error('You do not have a valid Wallet');
      }

      const [newBalanceDollar, newBalanceLC] = this.validateAndGenerateBalance(currentWallet, { ...createTransactionDto, tx_operation: "Add" });

      // Create the transaction object
      await this.updateTransaction(authUser, {
        ...createTransactionDto,
        updated_balance: createTransactionDto.coin_type === 'Dollar' ? newBalanceDollar : newBalanceLC
      });

      await this.walletService.updateWallet(authUser, {
        balance_dollar: newBalanceDollar,
        balance_lc: newBalanceLC,
        user_id: authUser.user_id,
      });

      return true;

    } catch (error) {
      throw new Error("error reverting transaction");
    }

  }

  async createTransaction(
    createTransactionDto: CreateTransactionDto,
  ): Promise<any> {
    const params = {
      TableName: this.tableName,
      Item: createTransactionDto,
    };

    try {
      await this.dynamoDb.send(new PutCommand(params));
      return createTransactionDto;
    } catch (error) {
      console.error('Error inserting item:', error);
      throw new Error('Error creating transaction');
    }
  }

  async getTransactionById(authUser: any, txId: string): Promise<any> {
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
      Key: { user_id: authUser.user_id, tx_id: txId },
    };

    try {
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this transaction deos not exist');
    }
  }

  async getTransactionsByType(txType: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'TransactionTypeIndex',
      KeyConditionExpression: '#txType = :txType',
      ExpressionAttributeValues: {
        ':txType': txType,
      },
      ExpressionAttributeNames: {
        '#txType': 'tx_type',
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

  async getTransactionsByIdType(tx_id: string, tx_status: string): Promise<any> {

    const params = {
      TableName: this.tableName,
      IndexName: 'TransactionIdStatusIndex',
      KeyConditionExpression: 'tx_id = :tx_id and tx_status = :tx_status',
      ExpressionAttributeValues: {
        ':tx_id': tx_id,
        ":tx_status": tx_status
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

  async getTransactionsByTypeAndStatus(txType: string, txStatus: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: "TransactionStatusTypeIndex",
      KeyConditionExpression: '#tx_status = :tx_status and #txType = :txType',
      ExpressionAttributeValues: {
        ':txType': txType,
        ":tx_status": txStatus
      },
      ExpressionAttributeNames: {
        '#txType': 'tx_type',
        '#tx_status': 'tx_status',
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

  async getTransactionsByGameId(user_id: string, game_id: string): Promise<any> {
    const params = {
      TableName: this.tableName,// Replace with your actual table name
      IndexName: 'TransactionGameIndex',
      KeyConditionExpression: '#user_id = :user_id AND #game_id = :game_id',
      FilterExpression: "#tx_status = :tx_status",
      ExpressionAttributeNames: {
        '#user_id': 'user_id',
        '#game_id': 'game_id',
        "#tx_status": "tx_status"
      },
      ExpressionAttributeValues: {
        ':user_id': user_id,
        ':game_id': game_id,
        ':tx_status': "Pending"
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  async getTransactionsByOperation(txOp: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'TransactionOperationIndex',
      KeyConditionExpression: '#txOP = :txOP',
      ExpressionAttributeValues: {
        ':txOP': txOp,
      },
      ExpressionAttributeNames: {
        '#txOP': 'tx_operation',
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

  async getUserTransactionByType(txType: string, authUser: any): Promise<any> {
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
      IndexName: 'TransactionTypeIndex',
      KeyConditionExpression: '#txType = :txType AND #userId = :userIdValue',
      ExpressionAttributeValues: {
        ':txType': txType,
        ':userIdValue': authUser.user_id,
      },
      ExpressionAttributeNames: {
        '#txType': 'tx_type',
        '#userId': 'user_id',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getUserTransactionByOperation(
    txOp: string,
    authUser: any,
  ): Promise<any> {
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
      IndexName: 'TransactionOperationIndex',
      KeyConditionExpression: '#txOP = :txOP AND #userId = :userIdValue',
      ExpressionAttributeValues: {
        ':txOP': txOp,
        ':userIdValue': authUser.user_id,
      },
      ExpressionAttributeNames: {
        '#txOP': 'tx_operation',
        '#userId': 'user_id',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  async getUserTransactions(authUser: any): Promise<any> {
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
      KeyConditionExpression: '#user_id = :userIdValue',
      ExpressionAttributeNames: {
        '#user_id': 'user_id',
      },
      ExpressionAttributeValues: {
        ':userIdValue': authUser.user_id,
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this transactions deos not exist');
    }
  }

  async getTransactionsSourceId(getTransactionsSourceDto: GetTransactionsSourceDto): Promise<any> {

    // process
    const params = {
      TableName: this.tableName,
      IndexName: 'SourceIdSourceTypeIndex',
      KeyConditionExpression: '#sourceId = :sourceId AND #sourceType = :sourceType',
      ExpressionAttributeValues: {
        ':sourceId': getTransactionsSourceDto.source_id,
        ':sourceType': getTransactionsSourceDto.source_type
      },
      ExpressionAttributeNames: {
        '#sourceId': 'source_id',
        '#sourceType': 'source_type'
      }
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this transactions not exist');
    }
  }

  async getAllTransactions(): Promise<any> {
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

  async depositCompanyWallet(createTransactionDto: CreateTransactionDto): Promise<any> {
    try {

      const [companyWallet] = await this.walletService.getWalletsByType('Company');

      if (!companyWallet) {
        throw new Error('Company wallet not found');
      }

      await this.validateAndCreateTransaction({ user_id: companyWallet.user_id }, { ...createTransactionDto, user_id: companyWallet.user_id });

      return true;
    } catch (error) {
      console.error('Error deposit company wallet', error);
      throw new Error('Error deposit company wallet');
    }
  }

  async depositPlayerLc(createTransactionDto: CreateTransactionDto): Promise<any> {
    try {

      const [companyWallet] = await this.walletService.getWalletsByType('Company');

      if (companyWallet.balance_lc >= createTransactionDto.amount) {

        await this.validateAndCreateTransaction({ user_id: companyWallet.user_id }, { ...createTransactionDto, tx_operation: "Remove", tx_type: 'Lucky Coin For Loss', user_id: companyWallet.user_id, remarks: `company wallet lucky coin given to game looser`, });

        await this.validateAndCreateTransaction({ user_id: createTransactionDto.user_id }, { ...createTransactionDto, user_id: createTransactionDto.user_id });

      } else {
        console.log('Insufficient balance or today quota end');
      }

      return true;
    } catch (error) {
      console.error('Error deposit company wallet', error);
      throw new Error('Error deposit company wallet');
    }
  }

  async updateTransaction(
    authUser: any,
    createTransactionDto: CreateTransactionDto,
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
        ...createTransactionDto,
        user_id: authUser.user_id,
      };

      const { user_id, tx_id, ...rest } = currentDetails;

      const params = updateParamsGenerator({ user_id, tx_id }, rest, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      throw new Error(error);
    }
  }

  async updateTransactionStatus(
    UpdateTransactionStatusDto: UpdateTransactionStatusDto,
  ): Promise<any> {
    try {

      let updateExpression = 'set';
      const ExpressionAttributeNames = {};
      const ExpressionAttributeValues = {};

      const { user_id, tx_id, ...rest } = UpdateTransactionStatusDto;

      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined && value !== null) {
          updateExpression += ` #${key} = :${key},`;
          ExpressionAttributeNames[`#${key}`] = key;
          ExpressionAttributeValues[`:${key}`] = value;
        }
      }

      // Remove the trailing comma from the update expression
      updateExpression = updateExpression.slice(0, -1);

      const params = {
        TableName: this.tableName,
        Key: { user_id: user_id, tx_id: tx_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: ReturnValue.ALL_NEW, // Return all the attributes of the updated item
      };

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      throw new Error(error);
    }
  }

  async deleteTransactionById(authUser: any, txId: string): Promise<any> {
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
      Key: { user_id: authUser.user_id, tx_id: txId },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }
}
