/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { IsTransactionType } from 'src/common/decorators/is-transaction-type.decorator';


export class GetTRansactionByTypeDto {
  @IsString()
  @IsTransactionType()
  @IsNotEmpty()
  tx_type: string;
}
