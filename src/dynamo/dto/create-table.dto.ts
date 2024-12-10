/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  ProvisionedThroughput,
  AttributeDefinition,
  KeySchemaElement,
} from '@aws-sdk/client-dynamodb';

export class CreateTableDto {
  tableName: string;
  keySchema: KeySchemaElement[];
  attributeDefinitions: AttributeDefinition[];
  provisionedThroughput: ProvisionedThroughput;
}
