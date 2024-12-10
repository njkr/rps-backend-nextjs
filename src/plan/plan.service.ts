/* eslint-disable prettier/prettier */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Injectable, Logger } from '@nestjs/common';
import { DynamoTables } from 'src/common/enum/dynamo.tables.enum';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { v4 as uuidv4 } from 'uuid';
import { CreatePlanDto } from './dto/create-Plan.dto';
import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdatePlanDto } from './dto/update-Plan.dto';
import { updateParamsGenerator } from 'src/common/utils/util-functions.utility';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);
  private readonly dynamoDb: DynamoDBClient;
  private readonly tableName: string;

  constructor(private readonly dynamoService: DynamoService) {
    this.tableName = DynamoTables.AIPlans;
    this.dynamoDb = dynamoService.getClient();
  }

  getTableName(): string {
    return this.tableName;
  }

  getTablePK(): string {
    return 'id';
  }

  async createPlan(createPlanDto: CreatePlanDto): Promise<any> {
    //generate auto id
    let generatedId = uuidv4();
    while (
      await this.dynamoService.isIdExist(
        generatedId,
        this.getTablePK(),
        this.getTableName(),
      )
    ) {
      generatedId = uuidv4();
    }

    const params = {
      TableName: this.tableName,
      Item: {
        ...createPlanDto,
        id: generatedId,
        date: new Date().toISOString(),
      },
    };

    try {
      const result = await this.dynamoDb.send(new PutCommand(params));

      return result;
    } catch (error) {
      console.error('Error inserting item:', error);
      throw new Error('Error creating plan');
    }
  }

  async getPlanById(id: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      Key: { id: id },
    };

    try {
      const result = await this.dynamoDb.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error('Error querying table:', error);
      throw new Error('this recoed deos not exist');
    }
  }

  async getPlanByName(planName: string): Promise<any> {

    const params = {
      TableName: this.getTableName(),
      FilterExpression: `#planName = :planName
      `,
      ExpressionAttributeNames: {
        '#planName': 'name',
      },
      ExpressionAttributeValues: {
        ':planName': planName,
      },
    };
    const command = new ScanCommand(params);

    try {
      const data = (await this.dynamoDb.send(command)).Items;
      return data.length > 0 ? data[0] : [];
    } catch (error) {
      console.error('Error querying table:', error);
      throw error;
    }
  }

  async getAllPlans(): Promise<any> {

    const params = {
      TableName: this.tableName,
      FilterExpression: "#active = :active",
      ExpressionAttributeValues: {
        ":active": true
      },
      ExpressionAttributeNames: {
        "#active": "active"
      }
    };

    try {
      const result = await this.dynamoDb.send(new ScanCommand(params));
      return result.Items;
    } catch (error) {
      console.error('Error scanning table:', error);
      throw new Error('Failed to scan the table');
    }
  }

  async updatePlan(updatePlanDto: UpdatePlanDto): Promise<any> {
    try {

      const updated_date = new Date().toISOString();

      const { id, ...rest } = { ...updatePlanDto, updated_date };

      const params = updateParamsGenerator({ id }, rest, this.tableName);

      const result = await this.dynamoDb.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('Error occurred:', error);
      throw error;
    }
  }

  async deletePlanById(id: string): Promise<any> {
    const params = {
      TableName: this.tableName,
      Key: { id: id },
    };

    try {
      return await this.dynamoDb.send(new DeleteCommand(params));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error('Failed to delete the item');
    }
  }
}
