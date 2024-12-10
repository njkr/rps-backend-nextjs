import { DynamoService } from 'src/dynamo/dynamo.service';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { ReturnValue } from '@aws-sdk/client-dynamodb';
import { randomBytes, randomInt } from 'crypto';
import { Server } from 'socket.io';
import { RolesEnum } from '../enum/admin.enum';
import {
  dateStartAndEndDateIsoFormatType,
  dateStartAndEndReturnType,
} from '../types/utlity.types';
import * as moment from 'moment';
import { Job, QueueEvents } from 'bullmq';
import { redisClient } from 'src/config/queue.config';

export function percentageCalculate(
  amount: number,
  percentage: number,
): number {
  try {
    return (percentage / 100) * amount;
  } catch (error) {
    throw new Error(error);
  }
}

export async function generateUniqueSubId(
  tablePKValue: string,
  tablePK: string,
  tableSK: string,
  tableName: string,
  dynamoService: DynamoService,
): Promise<string> {
  try {
    let generatedId = uuidv4();
    while (
      await dynamoService.isSubIdExist(
        tablePKValue,
        tablePK,
        generatedId,
        tableSK,
        tableName,
      )
    ) {
      generatedId = uuidv4();
    }

    return generatedId;
  } catch (error) {
    console.error('Error generate unique player lc id', error);
    throw error;
  }
}

export function handleResponse(
  res: Response,
  statusCode: number,
  message: string,
  data: any = {},
  errors: any[] = [],
): Response {
  return res.status(statusCode).json({
    statusCode,
    message,
    data,
    errors,
  });
}

export function updateParamsGenerator(
  key: object,
  updateValues: object,
  TableName: string,
  ReturnValues: ReturnValue = ReturnValue.ALL_NEW,
): any {
  let updateExpression = 'set';
  delete (updateValues as { date: any }).date;
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};

  for (const [key, value] of Object.entries({
    ...updateValues,
    updated_date: new Date().toISOString(),
  })) {
    if (value !== undefined && value !== null) {
      updateExpression += ` #${key} = :${key},`;
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:${key}`] = value;
    }
  }

  // Remove the trailing comma from the update expression
  updateExpression = updateExpression.slice(0, -1);

  return {
    TableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues,
  };
}

export function getRandomNumber(max: number): number {
  return randomInt(0, max);
}

export function handleServerEmitter(
  server: Server,
  emitterName: string,
  httpCode,
  message,
  data,
) {
  server.emit(emitterName, {
    httpCode,
    message,
    data,
  });
}

export type Attribute = {
  Name: string;
  Value: string;
};

export type AttributesArray = Attribute[];

export type ConvertedObject = {
  [key: string]: string;
};

export function convertToKeyValue(
  attributes: AttributesArray,
): ConvertedObject {
  return attributes.reduce((acc, attribute) => {
    acc[attribute.Name] = attribute.Value;
    return acc;
  }, {} as ConvertedObject);
}

const roleMapper: { [key: number]: RolesEnum } = {
  0: RolesEnum.USER,
  1: RolesEnum.ADMIN,
  2: RolesEnum.SUPER_ADMIN,
};

// Function to get role by number
export function getRoleByNumber(roleNumber: number): RolesEnum | null {
  return roleMapper[roleNumber] || null; // Returns null if no match is found
}

export function getNumberByRoleName(roleName: string): number | null {
  const roleEntry = Object.entries(roleMapper).find(
    ([, roleEnum]) => roleEnum === roleName,
  );

  return roleEntry ? parseInt(roleEntry[0]) : null; // Return number if found, else null
}

export function getStartAndEndOfDay(
  dateString: Date,
): dateStartAndEndReturnType {
  const startOfDay = new Date(dateString.setHours(0, 0, 0, 0)).toISOString();

  const endOfDay = new Date(dateString.setHours(23, 59, 59, 999)).toISOString();

  return {
    startOfDay,
    endOfDay,
  };
}

export function getTodayAndYesterday(): {
  today: dateStartAndEndReturnType;
  yesterday: dateStartAndEndReturnType;
} {
  // Get today's date
  const today = new Date();

  // Get yesterday's date by subtracting 1 day
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  return {
    today: getStartAndEndOfDay(today),
    yesterday: getStartAndEndOfDay(yesterday),
  };
}

export function getStartAndEndDateIsoFormat(
  startDateString: string,
  endDateString: string,
): dateStartAndEndDateIsoFormatType {
  const startDateIsoFormat = moment(startDateString, 'YYYY-MM-DD')
    .startOf('day')
    .toISOString();
  const endDateIsoFormat = moment(endDateString, 'YYYY-MM-DD')
    .endOf('day')
    .toISOString();

  return {
    startDateIsoFormat,
    endDateIsoFormat,
  };
}

export function addDaysToDate(dateString: string, daysToAdd: number): string {
  return moment(dateString).add(daysToAdd, 'days').toISOString();
}

export function feesCalculate(
  amount: number,
  percentage: number,
  rate: number,
): number {
  return percentageCalculate(amount, percentage) * rate;
}

type KeyValuePair = {
  Name: string;
  Value: string;
};

// Function to convert array of objects to a single object
export function convertArrayToObject(
  arr: KeyValuePair[],
): Record<string, string> {
  return arr.reduce(
    (acc, { Name, Value }) => {
      acc[Name] = Value; // Set the key-value pair in the accumulator
      return acc; // Return the updated accumulator
    },
    {} as Record<string, string>,
  ); // Initialize with an empty object
}
const queueEventsMap = new Map<string, QueueEvents>();

export const getQueueResponse = async (job: Job, keyId: string) => {
  if (!queueEventsMap.has(job.queueName)) {
    const queueEvents = new QueueEvents(job.queueName, {
      connection: redisClient,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    queueEventsMap.set(job.queueName, queueEvents);
  }

  const queueEvents = queueEventsMap.get(job.queueName);

  const { id, response } = await job.waitUntilFinished(queueEvents);

  if (id !== keyId) {
    throw new Error('Job ID mismatch, something went wrong');
  }

  return response;
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Gracefully shutting down...');

  for (const [queueName, queueEvents] of queueEventsMap.entries()) {
    await queueEvents.close();
    console.log(`Closed QueueEvents for queue: ${queueName}`);
  }

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// The selection process uses a method called the Alias Method, which efficiently picks a winner from a
// list where each ticket has a different chance of being selected based on its tickets count. The algorithm balances
// the probabilities by creating two tables: one for the chances (probabilities) and another for fallback options (aliases).
// When choosing a winner, a random index is picked, and then the algorithm uses a coin-flip style decision to either select the
// ticket at that index or its fallback alias, ensuring that tickets with larger amounts have a higher likelihood of being chosen,
// while still making the process quick and fair.

function createAliasTable(tickets) {
  const n = tickets.length;
  const probabilities = new Array(n);
  const aliases = new Array(n);
  const small = [];
  const large = [];

  const amounts = tickets.map((ticket) => ticket.amount);
  const total = amounts.reduce((acc, val) => acc + val, 0);
  const scaledAmounts = amounts.map((amount) => (amount * n) / total);

  // Step 1: Separate the tickets into 'small' and 'large' based on their scaled amounts
  scaledAmounts.forEach((amount, i) => {
    if (amount < 1) {
      small.push(i);
    } else {
      large.push(i);
    }
  });

  // Step 2: Construct the alias and probability tables
  while (small.length && large.length) {
    const smallIndex = small.pop();
    const largeIndex = large.pop();

    probabilities[smallIndex] = scaledAmounts[smallIndex];
    aliases[smallIndex] = largeIndex;

    scaledAmounts[largeIndex] =
      scaledAmounts[largeIndex] - (1 - scaledAmounts[smallIndex]);

    if (scaledAmounts[largeIndex] < 1) {
      small.push(largeIndex);
    } else {
      large.push(largeIndex);
    }
  }

  // Remaining probabilities for those who are exactly 1
  while (large.length) {
    probabilities[large.pop()] = 1;
  }
  while (small.length) {
    probabilities[small.pop()] = 1;
  }

  return { probabilities, aliases };
}

function getRandomCrypto() {
  const buffer = randomBytes(4);

  const randomNumber = buffer.readUInt32BE(0);

  return randomNumber / (0xffffffff + 1);
}

export function pickAliasWinner(tickets) {
  const { probabilities, aliases } = createAliasTable(tickets);
  const n = tickets.length;

  // Step 3: Pick a random index and then flip a biased coin using the probability table
  const randomIndex = Math.floor(getRandomCrypto() * n);
  const coinFlip =
    getRandomCrypto() < probabilities[randomIndex]
      ? randomIndex
      : aliases[randomIndex];

  return { winner: tickets[coinFlip], index: coinFlip };
}
