/* eslint-disable prettier/prettier */

import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
  DescribeTableCommand,
  DynamoDB,
  DynamoDBClientConfig,
  CreateTableCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { AppConfigService } from 'src/config/config.service';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';

@Injectable()
export class DynamoService implements OnModuleInit {
  private readonly dynamodb: DynamoDB;
  private readonly dynamoDbClient: DynamoDBClient;

  constructor(private readonly configService: AppConfigService) {
    const region = this.configService.awsRegion;
    const accessKeyId = this.configService.accessKeyId;
    const secretAccessKey = this.configService.secretAccessKey;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY must be set',
      );
    }
    const clientConfig: DynamoDBClientConfig = {
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    };

    this.dynamodb = new DynamoDB(clientConfig);

    this.dynamoDbClient = new DynamoDBClient(clientConfig);
  }

  async onModuleInit() {
    try {

      // List of tables to check and create if they don't exist
      const tables = [
        { name: DynamoTables.Users, createMethod: this.createPlayersTable.bind(this) },
        { name: DynamoTables.UserRewards, createMethod: this.createRewardTable.bind(this) },
        { name: DynamoTables.UserLCoins, createMethod: this.createLCTable.bind(this) },
        { name: DynamoTables.UserTickets, createMethod: this.createPlayerTicketTable.bind(this) },
        { name: DynamoTables.UserAIs, createMethod: this.createAITable.bind(this) },
        { name: DynamoTables.Games, createMethod: this.createGameTable.bind(this) },
        { name: DynamoTables.GameRounds, createMethod: this.createGameRoundTable.bind(this) },
        { name: DynamoTables.JackpotLookup, createMethod: this.createTicketsWinnerLookupTable.bind(this) },
        { name: DynamoTables.Jackpots, createMethod: this.createJackpotsTable.bind(this) },
        { name: DynamoTables.Marketplace, createMethod: this.createMarketplaceTable.bind(this) },
        { name: DynamoTables.Wallets, createMethod: this.createWalletTable.bind(this) },
        { name: DynamoTables.Transactions, createMethod: this.createTransactionTable.bind(this) },
        { name: DynamoTables.AIPlans, createMethod: this.createAIPlansTable.bind(this) },
        { name: DynamoTables.Rooms, createMethod: this.createRoomsTable.bind(this) },
        { name: DynamoTables.RoomsWaitingList, createMethod: this.createRoomsWaitingListTable.bind(this) },
        { name: DynamoTables.CurrencyRates, createMethod: this.createCurrencyRates.bind(this) },
        { name: DynamoTables.AppConfig, createMethod: this.createAppConfig.bind(this) },
      ];

      // Iterate through the tables and create if not exists
      for (const table of tables) {
        await this.checkAndCreateTable(table.name, table.createMethod);
      }
    } catch (error) {
      console.error('Error creating tables:', error);
    }
  }

  private async checkAndCreateTable(tableName: string, createMethod: () => Promise<void>) {
    const tableExists = await this.checkIfTableExists(tableName);
    if (!tableExists) {
      await createMethod();
      console.log(`${tableName} table created successfully.`);
    } else {
      console.log(`${tableName} table already exists.`);
    }
  }

  async checkIfTableExists(tableName: string): Promise<boolean> {
    try {
      // Create a new DescribeTableCommand
      const command = new DescribeTableCommand({ TableName: tableName });

      // Send the command using the client
      await this.dynamoDbClient.send(command);
      return true;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        return false;
      }
      // Re-throw the error if it is not a ResourceNotFoundException
      throw error;
    }
  }

  async isIdExist(
    idValue: string,
    idName: string,
    tableName: string,
  ): Promise<boolean> {
    const params = {
      TableName: tableName,
      Key: {
        [idName]: idValue,
      },
    };

    try {
      const result = await this.dynamoDbClient.send(new GetCommand(params));
      return !!result.Item; // Return true if item exists, false otherwise
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('Error checking if ID exists');
    }
  }

  async isSubIdExist(
    idValue: string,
    idName: string,
    idSubValue: string,
    idSubName: string,
    tableName: string,
  ): Promise<boolean> {
    const params = {
      TableName: tableName,
      Key: {
        [idName]: idValue,
        [idSubName]: idSubValue,
      },
    };

    try {
      const result = await this.dynamoDbClient.send(new GetCommand(params));
      return !!result.Item; // Return true if item exists, false otherwise
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('Error checking if ID exists');
    }
  }

  getClient(): DynamoDBClient {
    return this.dynamoDbClient;
  }

  async createTable(params: CreateTableCommandInput): Promise<CreateTableCommandOutput> {
    const command = new CreateTableCommand(params);

    try {
      return await this.dynamoDbClient.send(command);
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  private readonly globalIndexProjection = { ProjectionType: 'ALL' };
  private readonly globalIndexProvisionedThroughput = { ReadCapacityUnits: 5, WriteCapacityUnits: 5 };

  // ranges

  private readonly user_id_range = { AttributeName: 'user_id', KeyType: 'RANGE' };
  private readonly room_id_range = { AttributeName: 'room_id', KeyType: 'RANGE' };
  private readonly status_range = { AttributeName: 'status', KeyType: 'RANGE' };
  private readonly game_id_range = { AttributeName: 'game_id', KeyType: 'RANGE' };

  // hashes
  private readonly user_id_hash = { AttributeName: 'user_id', KeyType: 'HASH' };
  private readonly id_hash = { AttributeName: 'id', KeyType: 'HASH' };
  private readonly room_id_hash = { AttributeName: 'room_id', KeyType: 'HASH' };
  private readonly game_id_hash = { AttributeName: 'game_id', KeyType: 'HASH' };
  private readonly status_hash = { AttributeName: 'status', KeyType: 'HASH' };
  private readonly type_hash = { AttributeName: 'type', KeyType: 'HASH' };
  private readonly source_id_hash = { AttributeName: 'source_id', KeyType: 'HASH' };

  //keys
  private readonly user_id_string = { AttributeName: 'user_id', AttributeType: 'S' };
  private readonly status_string = { AttributeName: 'status', AttributeType: 'S' };
  private readonly id_string = { AttributeName: 'id', AttributeType: 'S' };
  private readonly date_string = { AttributeName: 'date', AttributeType: 'S' };
  private readonly game_id_string = { AttributeName: 'game_id', AttributeType: 'S' };
  private readonly type_string = { AttributeName: 'type', AttributeType: 'S' };


  private createBaseParams(
    tableName: string,
    keySchema: any[],
    attributeDefinitions: any[],
    globalSecondaryIndexes: any[] = []
  ): CreateTableCommandInput {
    const baseParams: CreateTableCommandInput = {
      TableName: tableName,
      KeySchema: keySchema,
      AttributeDefinitions: attributeDefinitions,
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    };

    // Only add GlobalSecondaryIndexes if it's not an empty array
    if (globalSecondaryIndexes.length > 0) {
      baseParams.GlobalSecondaryIndexes = globalSecondaryIndexes.map((index) => ({
        ...index,
        Projection: this.globalIndexProjection,
        ProvisionedThroughput: this.globalIndexProvisionedThroughput,
      }));
    }

    return baseParams;
  }

  async createTicketsWinnerLookupTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.JackpotLookup,
      [this.id_hash],
      [this.id_string]
    );

    return this.createTable(params);
  }

  async createPlayersTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.Users,
      [this.user_id_hash],
      [
        this.user_id_string,
        { AttributeName: 'uid', AttributeType: 'S' }
      ],
      [
        {
          IndexName: 'UidIndex',
          KeySchema: [
            { AttributeName: 'uid', KeyType: 'HASH' }
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createRewardTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.UserRewards,
      [
        this.user_id_hash,
        { AttributeName: 'reward_id', KeyType: 'RANGE' }
      ],
      [
        this.user_id_string,
        { AttributeName: 'reward_id', AttributeType: 'S' },
        { AttributeName: 'reward_type', AttributeType: 'S' },
        this.status_string
      ],
      [
        {
          IndexName: 'RewardTypeIndex',
          KeySchema: [
            { AttributeName: 'reward_type', KeyType: 'HASH' },
            this.status_range
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createLCTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.UserLCoins,
      [
        this.user_id_hash,
        { AttributeName: 'lc_id', KeyType: 'RANGE' }
      ],
      [
        this.user_id_string,
        { AttributeName: 'lc_id', AttributeType: 'S' },
        { AttributeName: 'source', AttributeType: 'S' },
        this.date_string
      ],
      [
        {
          IndexName: 'UserStateIndex',
          KeySchema: [
            { AttributeName: 'source', KeyType: 'HASH' },
            { AttributeName: 'date', KeyType: 'RANGE' }
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createAITable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.UserAIs,
      [
        this.user_id_hash,
        { AttributeName: 'id', KeyType: 'RANGE' }
      ],
      [
        this.user_id_string,
        this.id_string,
        { AttributeName: 'plan_id', AttributeType: 'S' },
        this.date_string
      ],
      [
        {
          IndexName: 'UserAIsPlanIndex',
          KeySchema: [
            { AttributeName: 'plan_id', KeyType: 'HASH' },
            this.user_id_range
          ],
        },
        {
          IndexName: 'UserAIsDateIndex',
          KeySchema: [
            { AttributeName: 'date', KeyType: 'HASH' },
            this.user_id_range
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createGameTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.Games,
      [this.game_id_hash],
      [
        this.game_id_string,
        { AttributeName: 'winner', AttributeType: 'S' },
        { AttributeName: 'source_type', AttributeType: 'S' },
        { AttributeName: 'source_id', AttributeType: 'S' }
      ],
      [
        {
          IndexName: 'GameWinnerIndex',
          KeySchema: [
            { AttributeName: 'winner', KeyType: 'HASH' },
            this.game_id_range
          ],
        },
        {
          IndexName: 'GameSourceIndex',
          KeySchema: [
            { AttributeName: 'source_type', KeyType: 'HASH' },
            this.game_id_range
          ],
        },
        {
          IndexName: 'GameSourceIdIndex',
          KeySchema: [this.source_id_hash],
        }
      ]
    );

    return this.createTable(params);
  }

  async createGameRoundTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.GameRounds,
      [{ AttributeName: 'round_id', KeyType: 'HASH' }],
      [
        this.game_id_string,
        { AttributeName: 'round_id', AttributeType: 'S' },
        { AttributeName: 'game_round', AttributeType: 'N' }
      ],
      [
        {
          IndexName: 'GameWinnerIndex',
          KeySchema: [this.game_id_hash],
        },
        {
          IndexName: 'GameRoundIndex',
          KeySchema: [
            this.game_id_hash,
            { AttributeName: 'game_round', KeyType: 'RANGE' }
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createPlayerTicketTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.UserTickets,
      [
        this.user_id_hash,
        { AttributeName: 'ticket_id', KeyType: 'RANGE' }
      ],
      [
        this.user_id_string,
        { AttributeName: 'ticket_id', AttributeType: 'S' },
        { AttributeName: 'jackpot_id', AttributeType: 'S' },
        this.status_string
      ],
      [
        {
          IndexName: 'JackpotStatusIndex',
          KeySchema: [
            { AttributeName: 'jackpot_id', KeyType: 'HASH' },
            this.status_range
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createJackpotsTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.Jackpots,
      [this.id_hash],
      [
        this.id_string,
        this.status_string,
        { AttributeName: 'start_date', AttributeType: 'S' }
      ],
      [
        {
          IndexName: 'JackpotStatusIndex',
          KeySchema: [this.status_hash],
        },
        {
          IndexName: 'JackpotStatusDateIndex',
          KeySchema: [
            this.status_hash,
            { AttributeName: 'start_date', KeyType: 'RANGE' }
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createMarketplaceTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.Marketplace,
      [
        this.user_id_hash,
        { AttributeName: 'offer_id', KeyType: 'RANGE' }
      ],
      [
        this.user_id_string,
        { AttributeName: 'offer_id', AttributeType: 'S' },
        this.status_string,
        this.type_string
      ],
      [
        {
          IndexName: 'MarketStatusIndex',
          KeySchema: [
            this.status_hash,
            this.user_id_range
          ],
        },
        {
          IndexName: 'MarketTypeIndex',
          KeySchema: [
            this.type_hash,
            this.user_id_range
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createWalletTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.Wallets,
      [this.user_id_hash],
      [
        this.user_id_string,
        this.type_string
      ],
      [
        {
          IndexName: 'wallet-type-index',
          KeySchema: [this.type_hash],
        }
      ]
    );

    return this.createTable(params);
  }

  async createTransactionTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.Transactions,
      [
        this.user_id_hash,
        { AttributeName: 'tx_id', KeyType: 'RANGE' }
      ],
      [
        this.user_id_string,
        { AttributeName: 'tx_id', AttributeType: 'S' },
        { AttributeName: 'tx_type', AttributeType: 'S' },
        { AttributeName: 'tx_operation', AttributeType: 'S' },
        { AttributeName: 'source_id', AttributeType: 'S' },
        { AttributeName: 'source_type', AttributeType: 'S' },
        this.game_id_string
      ],
      [
        {
          IndexName: 'TransactionTypeIndex',
          KeySchema: [
            { AttributeName: 'tx_type', KeyType: 'HASH' },
            this.user_id_range
          ],
        },
        {
          IndexName: 'TransactionOperationIndex',
          KeySchema: [
            { AttributeName: 'tx_operation', KeyType: 'HASH' },
            this.user_id_range
          ],
        },
        {
          IndexName: 'TransactionGameIndex',
          KeySchema: [
            this.user_id_hash,
            this.game_id_range
          ],
        },
        {
          IndexName: 'SourceIdSourceTypeIndex',
          KeySchema: [
            this.source_id_hash,
            { AttributeName: 'source_type', KeyType: 'RANGE' }
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createAIPlansTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.AIPlans,
      [this.id_hash],
      [this.id_string]
    );

    return this.createTable(params);
  }

  async createRoomsTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.Rooms,
      [
        this.user_id_hash,
        this.room_id_range
      ],
      [
        this.user_id_string,
        { AttributeName: 'room_id', AttributeType: 'S' },
        this.status_string,
        this.type_string
      ],
      [
        {
          IndexName: 'RoomStatusIndex',
          KeySchema: [
            this.status_hash,
            this.user_id_range
          ],
        },
        {
          IndexName: 'RoomTypeIndex',
          KeySchema: [
            this.type_hash,
            this.user_id_range
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createRoomsWaitingListTable(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.RoomsWaitingList,
      [this.id_hash],
      [
        this.id_string,
        this.user_id_string,
        { AttributeName: 'room_id', AttributeType: 'S' },
        this.status_string
      ],
      [
        {
          IndexName: 'RoomWaitingListStatusUserIndex',
          KeySchema: [
            this.status_hash,
            this.user_id_range
          ],
        },
        {
          IndexName: 'RoomIdUserIdIndex',
          KeySchema: [
            this.room_id_hash,
            this.user_id_range
          ],
        },
        {
          IndexName: 'RoomWaitingListStatusRoomIndex',
          KeySchema: [
            this.status_hash,
            this.room_id_range
          ],
        },
        {
          IndexName: 'RoomIdIndex',
          KeySchema: [this.room_id_hash],
        },
        {
          IndexName: 'UserIdIndex',
          KeySchema: [this.user_id_hash],
        }
      ]
    );

    return this.createTable(params);
  }

  async createCurrencyRates(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.CurrencyRates,
      [this.id_hash],
      [
        this.id_string,
        { AttributeName: 'currency', AttributeType: 'S' },
      ],
      [
        {
          IndexName: 'CurrencyIndex',
          KeySchema: [
            { AttributeName: 'currency', KeyType: 'HASH' },
          ],
        }
      ]
    );

    return this.createTable(params);
  }

  async createAppConfig(): Promise<CreateTableCommandOutput> {
    const params = this.createBaseParams(
      DynamoTables.AppConfig,
      [this.id_hash],
      [
        this.id_string
      ]
    );

    return this.createTable(params);
  }
}
