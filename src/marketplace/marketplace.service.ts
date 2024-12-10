/* eslint-disable prettier/prettier */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { GetCommand, PutCommand, QueryCommand, QueryCommandInput, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { CognitoService } from 'src/auth/cognito.service';
import { v4 as uuidv4 } from 'uuid';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { AppConfigService } from 'src/config/config.service';
import { GetOfferByPriceTypeStatusDto } from './dto/get-offer-price-status-type.dto';
import { TransactionService } from 'src/transaction/transaction.service';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';
import { getCountBetweenDates, getTotalCount } from 'src/common/utils/dynamo.querry.utility';
import * as moment from 'moment';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly s3Client: S3Client;
  private readonly s3BucketName = 'lucky-hands-offers';
  private readonly tableName: string;

  constructor(
    private readonly dynamoService: DynamoService,
    private readonly cognitoService: CognitoService,
    private readonly configService: AppConfigService,
    private readonly transactionService: TransactionService,
  ) {
    this.tableName = DynamoTables.Marketplace;
    this.dynamoDb = dynamoService.getClient();
    this.s3Client = new S3Client({ region: this.configService.awsRegion });
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'user_id';
  }

  getTableSK(): string {
    return 'offer_id';
  }

  private async uploadImageToS3(
    image: string,
    imageName: string,
  ): Promise<string> {
    const buffer = Buffer.from(image, 'base64');
    const uploadCommand = new PutObjectCommand({
      Bucket: this.s3BucketName,
      Key: `offers/${imageName}`,
      Body: buffer,
      ContentType: 'image/jpeg', // Adjust MIME type as needed
    });

    await this.s3Client.send(uploadCommand);

    return `https://${this.s3BucketName}.s3.amazonaws.com/offers/${imageName}`;
  }

  async validateAndCreateOffer(authUser: any, createOfferDto: CreateOfferDto) {
    // Check if the user exists in Cognito
    const cognitoUser = await this.cognitoService.checkIfUserExists(
      authUser.user_id,
    );
    if (!cognitoUser) {
      throw new Error('You do not have a valid account');
    }

    // Extract user's name from Cognito user attributes
    const name = cognitoUser.UserAttributes.find(
      (v) => v.Name === 'name',
    ).Value;

    // check user have balance
    const offer_fee = (createOfferDto.offer_price * 1) / 100;

    // Generate a unique offer ID
    let generatedId = uuidv4();
    while (
      await this.dynamoService.isSubIdExist(
        authUser.user_id,
        this.getTablePK(),
        generatedId,
        this.getTableSK(),
        this.getTableName(),
      )
    ) {
      generatedId = uuidv4();
    }

    if (createOfferDto.type === 'Coins') {

      await this.transactionService.validateAndCreateTransactionWithFees(
        {
          user_id: authUser.user_id,
        },
        {
          user_id: authUser.user_id,
          tx_type: 'Lucky Coin Sale',
          tx_status: "Pending",
          tx_operation: 'Remove',
          tx_fee: offer_fee,
          tx_fee_coin_type: 'Dollar',
          coin_type: 'LC',
          amount: createOfferDto.offer_amount,
          source_type: 'Marketplace',
          source_id: generatedId,
          remarks: "lucky coin sale offer created",
          date: new Date().toISOString(),
        },
      );

    }

    if (createOfferDto.offer_img) {
      // Upload the offer image to S3
      const offerImageUrl = await this.uploadImageToS3(
        createOfferDto.offer_img,
        createOfferDto.offer_id,
      );
      createOfferDto = { ...createOfferDto, offer_img: offerImageUrl };
    }


    // Create the offer object
    const insertOfferDto = {
      user_id: authUser.user_id,
      offer_owner: name,
      offer_id: generatedId,
      status: 'Open',
      offer_fee,
      ...createOfferDto,
    };

    // Save the offer to the database
    return await this.createOffer(insertOfferDto);
  }

  async createOffer(createOfferDto: CreateOfferDto): Promise<any> {
    const params = {
      TableName: this.tableName,
      Item: createOfferDto,
    };

    try {
      const result = await this.dynamoDb.send(new PutCommand(params));
      return result;
    } catch (error) {
      console.error('Error inserting item:', error);
      throw new Error('Error creating Offer');
    }
  }

  async getTodaysAndYesterdaysMarketplaceCount(): Promise<any> {

    const startOfMonth = moment().startOf('month').toISOString();  // Start of the month in ISO format
    const currentLiveDate = moment().toISOString();

    const additionalFilter = `(#type <> :type) AND ( #status = :status )`;

    const additionalExpressionAttributeValues = {
      ":type": { S: "Coins" },
      ":status": { S: "Open" },
    };

    const additionalExpressionAttributeNames = {
      "#type": "type",
      "#status": "status",
    }

    try {


      const monthCount = await getCountBetweenDates(
        {
          startDate: startOfMonth,
          endDate: currentLiveDate,
          tableName: this.tableName,
          attributeName: 'date',
          additionalFilterExpression: additionalFilter,
          additionalExpressionAttributeValues,
          additionalExpressionAttributeNames,
        },
        this.dynamoDb,
      );

      const totalCount = await getTotalCount(this.tableName, additionalFilter, additionalExpressionAttributeValues, additionalExpressionAttributeNames, this.dynamoDb);

      return {
        monthCount,
        totalCount,
      };

    } catch (error) {

      console.error("Error querying DynamoDB:", error);
      throw error;

    }
  }

  async getOfferById(authUser: any, offerId: string): Promise<any> {
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
      Key: { user_id: authUser.user_id, offer_id: offerId },
    };

    try {
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this Offer deos not exist');
    }
  }

  async getOfferOfferId(offerId: string): Promise<any> {
    // Check if the user exists in Cognito
    // process
    const params = {
      TableName: this.tableName,
      FilterExpression: 'offer_id = :offerId',
      ExpressionAttributeValues: {
        ':offerId': offerId,
      },
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this Offer deos not exist');
    }
  }


  async getOffersByStatus(status: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'MarketStatusIndex',
      KeyConditionExpression: '#offerStatus = :offerStatus',
      ExpressionAttributeValues: {
        ':offerStatus': status,
      },
      ExpressionAttributeNames: {
        '#offerStatus': 'status',
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

  async getAllOffersByPriceStatusType(getOfferByPriceTypeStatusDto: GetOfferByPriceTypeStatusDto): Promise<any> {

    try {
      const { offerPrice = 0, offerStatus, offerType } = getOfferByPriceTypeStatusDto;
      const params: QueryCommandInput = {
        TableName: this.tableName,
        ConsistentRead: false,
        FilterExpression: "#offerPrice >= :offerPrice",
        ExpressionAttributeValues: {
          ":offerPrice": Number(offerPrice),
        },
        ExpressionAttributeNames: {
          "#offerPrice": "offer_price"
        }
      }

      if (offerStatus && offerType) {
        params.FilterExpression = `${params.FilterExpression} And #offerStatus = :offerStatus And #offerType = :offerType`;
        params.ExpressionAttributeValues = {
          ...params.ExpressionAttributeValues,
          ":offerStatus": offerStatus,
          ":offerType": offerType
        };
        params.ExpressionAttributeNames = {
          ...params.ExpressionAttributeNames,
          "#offerStatus": "status",
          "#offerType": "type"
        }
      } else if (offerStatus) {
        params.FilterExpression = `${params.FilterExpression} And #offerStatus = :offerStatus`;
        params.ExpressionAttributeValues = {
          ...params.ExpressionAttributeValues,
          ":offerStatus": offerStatus
        };
        params.ExpressionAttributeNames = {
          ...params.ExpressionAttributeNames,
          "#offerStatus": "status",
        }
      } else if (offerType) {
        params.FilterExpression = `${params.FilterExpression} And #offerType = :offerType`;
        params.ExpressionAttributeValues = {
          ...params.ExpressionAttributeValues,
          ":offerType": offerType
        };
        params.ExpressionAttributeNames = {
          ...params.ExpressionAttributeNames,
          "#offerType": "type",
        }
      }

      const command = new ScanCommand(params);
      const result = await this.dynamoDb.send(command);
      return result.Items;
    } catch (error) {
      console.error('Error querying index:', error);
      throw new Error('Failed to query the index');
    }

  }

  async getOffersByType(type: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      IndexName: 'MarketTypeIndex',
      KeyConditionExpression: '#offerType = :offerType',
      ExpressionAttributeValues: {
        ':offerType': type,
      },
      ExpressionAttributeNames: {
        '#offerType': 'type',
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

  async getUserOffersByStatus(status: string, authUser: any): Promise<any> {
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
      IndexName: 'MarketStatusIndex',
      KeyConditionExpression:
        '#offerStatus = :offerStatus AND #userId = :userIdValue',
      ExpressionAttributeValues: {
        ':offerStatus': status,
        ':userIdValue': authUser.user_id,
      },
      ExpressionAttributeNames: {
        '#offerStatus': 'status',
        '#userId': 'user_id',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      throw new Error('failed to get User Offers By Status');
    }
  }

  async getUserOffersByType(type: string, authUser: any): Promise<any> {
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
      IndexName: 'MarketTypeIndex',
      KeyConditionExpression:
        '#offerType = :offerType AND #userId = :userIdValue',
      ExpressionAttributeValues: {
        ':offerType': type,
        ':userIdValue': authUser.user_id,
      },
      ExpressionAttributeNames: {
        '#offerType': 'type',
        '#userId': 'user_id',
      },
    };

    try {
      const result = await this.dynamoDb.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      throw new Error('Failed to get User Offers By Type');
    }
  }

  async getUserOffers(authUser: any): Promise<any> {
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
      return result.Items;
    } catch (error) {
      throw new Error('failed to get User Offers');
    }
  }

  async getAllOffers(): Promise<any> {
    const params = {
      TableName: this.tableName,
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items;
    } catch (error) {
      throw new Error('Failed to scan the table');
    }
  }

  async updateOffer(
    authUser: any,
    updateOfferDto: UpdateOfferDto,
  ): Promise<any> {
    try {

      const currentDetails = {
        ...updateOfferDto,
        user_id: authUser.user_id,
      };

      const { user_id, offer_id, ...rest } = currentDetails;

      const params = updateParamsGenerator({ user_id, offer_id }, rest, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      throw new Error(error);
    }
  }

  async deleteOffer({ transactionData, offerDetails }): Promise<any> {

    // process
    await this.transactionService.revertTransaction({ user_id: transactionData.user_id }, { ...transactionData, tx_status: 'Reverted', remarks: transactionData.remarks + " | marketplace delete offer" });

    await this.updateOffer(
      { user_id: offerDetails.user_id },
      { ...offerDetails, status: "Closed", updated_date: new Date().toISOString() },
    );

  }

  async purchaseOffer({ authUser, offerDetails, transactionData, companyWallet }): Promise<any> {
    // deduct dollar from current user

    await this.transactionService.validateAndCreateTransactionWithFees(
      {
        user_id: authUser.user_id,
      },
      {
        user_id: authUser.user_id,
        tx_type: 'Lucky Coin Buy',
        tx_status: "Success",
        tx_operation: 'Remove',
        coin_type: 'Dollar',
        tx_fee: offerDetails.offer_fee,
        tx_fee_coin_type: 'Dollar',
        amount: offerDetails.offer_price,
        source_type: 'Marketplace',
        source_id: offerDetails.offer_id,
        remarks: "lucky coin buy using Dollar",
        date: new Date().toISOString(),
      },
    );

    // add lucky coin to current user
    await this.transactionService.validateAndCreateTransaction(
      {
        user_id: authUser.user_id,
      },
      {
        user_id: authUser.user_id,
        tx_type: 'Lucky Coin Buy',
        tx_status: "Success",
        tx_operation: 'Add',
        coin_type: 'LC',
        amount: offerDetails.offer_amount,
        source_type: 'Marketplace',
        source_id: offerDetails.offer_id,
        remarks: "lucky coin got for dollar",
        date: new Date().toISOString(),
      },
    );

    // add dollars to owner
    await this.transactionService.validateAndCreateTransaction(
      {
        user_id: transactionData.user_id,
      },

      {
        user_id: transactionData.user_id,
        tx_type: 'Lucky Coin Buy',
        tx_status: "Success",
        tx_operation: 'Add',
        coin_type: 'Dollar',
        amount: offerDetails.offer_price,
        source_type: 'Marketplace',
        source_id: offerDetails.offer_id,
        remarks: "dollar got for lucky coin",
        date: new Date().toISOString(),
      },
    );

    // add dollars to the company wallet
    await this.transactionService.validateAndCreateTransaction(
      {
        user_id: companyWallet.user_id,
      },
      {
        user_id: companyWallet.user_id,
        tx_type: 'Marketplace Revenue',
        tx_status: "Success",
        tx_operation: 'Add',
        coin_type: 'Dollar',
        amount: offerDetails.offer_fee,
        source_type: 'Marketplace',
        source_id: offerDetails.offer_id,
        remarks: "lucky commission",
        date: new Date().toISOString(),
      },
    );

    // make the main transaction successful
    await this.transactionService.updateTransaction(
      { user_id: transactionData.user_id },
      { ...transactionData, tx_status: "Success", remarks: transactionData.remarks + " lucky coin purchase completed", updated_date: new Date().toISOString() },
    )

    // complete the offer
    const data = await this.updateOffer(
      { user_id: offerDetails.user_id },
      { ...offerDetails, status: "Sold", updated_date: new Date().toISOString() },
    );

    return data;
  }
}
