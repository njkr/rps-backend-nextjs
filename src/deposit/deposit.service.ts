import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ethers } from 'ethers';
import { CreateWeb3ContractDto } from 'src/admin/dashboard/dto/web3-contreact.dto';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { PlayerService } from 'src/player/player.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DepositService implements OnModuleInit {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;

  private readonly logger = new Logger(DepositService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;
  private wallet: ethers.Wallet;

  constructor(
    private readonly dynamoService: DynamoService,
    private readonly playerService: PlayerService,
    @InjectQueue('deposit') private readonly depositQueue: Queue,
    private readonly transactionService: TransactionService,
  ) {
    this.tableName = DynamoTables.Web3;
    this.dynamoDb = this.dynamoService.getClient();
  }

  async getActiveAccount(): Promise<any> {
    const params = {
      TableName: this.tableName,
      FilterExpression: 'is_active = :is_active',
      ExpressionAttributeValues: {
        ':is_active': true,
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

  async getAllAccount(): Promise<any> {
    const params = {
      TableName: this.tableName,
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }
  }

  private async initialize() {
    const activeConnection = await this.getActiveAccount();

    if (!activeConnection) {
      this.logger.error('No active connection found');
      return;
    }

    const { url, address, deposit_event, withdraw_event, abi, private_key } =
      activeConnection;

    this.provider = new ethers.providers.JsonRpcProvider(url);

    this.wallet = new ethers.Wallet(private_key, this.provider);

    this.contract = new ethers.Contract(address, JSON.parse(abi), this.wallet);

    console.log('Listening for deposit events...');

    this.handleDepositEvent(deposit_event);
    this.handleWithdrawEvent(withdraw_event);
  }

  async onModuleInit() {
    await this.initialize();
  }

  async reload() {
    this.contract.removeAllListeners();
    await this.initialize();
  }

  async insertAccount(
    createWeb3ContractDto: CreateWeb3ContractDto,
  ): Promise<any> {
    let id = uuidv4();
    while (await this.dynamoService.isIdExist(id, 'id', this.tableName)) {
      id = uuidv4();
    }

    const params = {
      TableName: this.tableName,
      Item: {
        ...createWeb3ContractDto,
        id,
        abi: JSON.stringify(createWeb3ContractDto.abi),
      },
    };

    try {
      const result = await this.dynamoDb.send(new PutCommand(params));

      if (createWeb3ContractDto.is_active) {
        const activeAccount = await this.getActiveAccount();

        if (activeAccount) {
          await this.updateAccount({
            id: activeAccount.id,
            user_id: createWeb3ContractDto.user_id,
            is_active: false,
          });
        }

        await this.reload();
      }

      return result;
    } catch (error) {
      console.error('Error creating contract', error);
      throw new Error('Error creating contract');
    }
  }

  async validateAndUpdate(updateWeb3Contract: any): Promise<any> {
    const { id } = updateWeb3Contract;

    try {
      const activeAccount = await this.getActiveAccount();

      if (
        !activeAccount ||
        (activeAccount.id === id && !activeAccount.is_active)
      ) {
        throw new Error('must have one active account to update');
      }

      await this.updateAccount(updateWeb3Contract);

      if (activeAccount.id !== id && updateWeb3Contract.is_active) {
        await this.updateAccount({
          id: activeAccount.id,
          user_id: updateWeb3Contract.user_id,
          is_active: false,
        });
        await this.reload();
      } else if (updateWeb3Contract.is_active) {
        await this.reload();
      }

      return true;
    } catch (error) {
      console.error('Error updating contract', error);
      throw new Error(error.message);
    }
  }

  async updateAccount(updateWeb3Contract: any): Promise<any> {
    const { id, ...rest } = updateWeb3Contract;

    try {
      if (rest.hasOwnProperty('abi')) {
        rest.abi = JSON.stringify(rest.abi);
      }

      const params = updateParamsGenerator({ id }, { ...rest }, this.tableName);

      const response = await this.dynamoDb.send(new UpdateCommand(params));

      return response;
    } catch (error) {
      console.error('Error updating contract', error);
      throw new Error(error.message);
    }
  }

  private handleDepositEvent(event: string) {
    this.contract.on(event, async (from, amount, uniqueId, event) => {
      this.logger.log(
        `Deposit event: from ${from}, amount ${amount}, uniqueId ${uniqueId}, event ${event}`,
      );

      const data = await this.playerService.getPlayerDetails({
        user_id: uniqueId,
      });

      if (!data) {
        this.logger.error('Player not found');
        return;
      }

      const transactionData =
        await this.transactionService.getTransactionsSourceId({
          source_type: 'Payment',
          source_id: event.transactionHash,
        });

      if (transactionData.length > 0) {
        this.logger.warn('Transaction already exists');
        return;
      }

      await this.depositQueue.add(
        'deposit',
        {
          amount: parseInt(ethers.utils.formatEther(amount)),
          transactionHash: event.transactionHash,
          user_id: uniqueId,
        },
        {
          attempts: 3,
          deduplication: {
            id: event.transactionHash,
          },
        },
      );
    });
  }

  private handleWithdrawEvent(event: string) {
    this.contract.on(event, async (from, amount, tx_id, event) => {
      this.logger.log(
        `Withdraw event: from ${from}, amount ${amount}, uniqueId ${tx_id}, event ${event}`,
      );

      const [transactionData] =
        await this.transactionService.getTransactionsByIdType(tx_id, 'Pending');

      if (!transactionData) {
        this.logger.error('transaction not found');
        return;
      }

      await this.transactionService.updateTransaction(
        { user_id: transactionData.user_id },
        {
          ...transactionData,
          tx_status: 'Success',
          source_id: event.transactionHash,
          remarks: transactionData.remarks + ' | transaction completed',
        },
      );

      return true;
    });
  }

  withdraw(amount: ethers.BigNumber, receiver: string, tx_id: string): void {
    try {
      const gasOptions = {
        gasLimit: ethers.BigNumber.from('1000000'), // Adjust as needed
        gasPrice: ethers.utils.parseUnits('50', 'gwei'), // Adjust the gas price (in gwei)
      };

      // Call the withdraw function from the contract
      this.contract.withdraw(amount, receiver, tx_id, gasOptions);
    } catch (error) {
      console.error('Withdrawal failed:', error);
      throw new Error('Failed to withdraw funds');
    }
  }
}
