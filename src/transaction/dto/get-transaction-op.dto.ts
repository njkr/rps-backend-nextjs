/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { IsTransactionOperation } from 'src/common/decorators/is-transaction-operation.decorator';


export class GetTransactionByOpDto {
  @IsString()
  @IsTransactionOperation()
  @IsNotEmpty()
  tx_operation: string;
}
