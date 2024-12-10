import {
  AttributeValue,
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { ScanCommandInput } from '@aws-sdk/lib-dynamodb';

interface FilterParams {
  startDate: string;
  endDate: string;
  tableName: string;
  attributeName: string;
  additionalFilterExpression?: string;
  additionalExpressionAttributeValues?: Record<string, AttributeValue>;
  additionalExpressionAttributeNames?: Record<string, string>;
}

export async function getCountBetweenDates(
  {
    startDate,
    endDate,
    tableName,
    attributeName,
    additionalFilterExpression = '',
    additionalExpressionAttributeValues = {},
    additionalExpressionAttributeNames = {},
  }: FilterParams,
  dynamoDb: DynamoDBClient,
): Promise<number> {
  const baseFilterExpression = `(#${attributeName} BETWEEN :startDate AND :endDate)`;
  const filterExpression = additionalFilterExpression
    ? `${baseFilterExpression} AND ${additionalFilterExpression}`
    : baseFilterExpression;

  const expressionAttributeNames = {
    [`#${attributeName}`]: attributeName,
    ...additionalExpressionAttributeNames,
  };

  const expressionAttributeValues: Record<string, AttributeValue> = {
    ':startDate': { S: startDate },
    ':endDate': { S: endDate },
    ...additionalExpressionAttributeValues,
  };

  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression: filterExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    Select: 'COUNT',
  });

  try {
    const result = await dynamoDb.send(command);
    return result.Count ?? 0;
  } catch (error) {
    console.error(`Error querying DynamoDB for table: ${tableName}`, error);
    throw new Error(`Error querying DynamoDB: ${error.message}`);
  }
}

export async function getTotalCount(
  tableName: string,
  additionalFilterExpression: string,
  additionalExpressionAttributeValues: any,
  additionalExpressionAttributeNames: any,
  dynamoDb: DynamoDBClient,
): Promise<number> {
  let params: ScanCommandInput = {
    TableName: tableName,
    Select: 'COUNT',
  };

  if (additionalFilterExpression !== '') {
    params = {
      ...params,
      FilterExpression: additionalFilterExpression,
    };
  }

  if (Object.keys(additionalExpressionAttributeNames).length !== 0) {
    params = {
      ...params,
      ExpressionAttributeNames: {
        ...additionalExpressionAttributeNames,
      },
    };
  }

  if (Object.keys(additionalExpressionAttributeValues).length !== 0) {
    params = {
      ...params,
      ExpressionAttributeValues: {
        ...additionalExpressionAttributeValues,
      },
    };
  }

  const command = new ScanCommand(params);

  try {
    const result = await dynamoDb.send(command);
    return result.Count;
  } catch (error) {
    throw new Error(`Error querying DynamoDB: ${tableName}`);
  }
}
