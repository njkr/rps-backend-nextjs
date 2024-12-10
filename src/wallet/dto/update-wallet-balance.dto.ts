/* eslint-disable prettier/prettier */
import {
  IsString,
  Min,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { IsCoinType } from 'src/common/decorators/is-coin-type.decorator';
import { IsTransactionOperation } from 'src/common/decorators/is-transaction-operation.decorator';


export class UpdateWalletBalanceDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  user_id: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @IsString()
  @IsTransactionOperation()
  @IsNotEmpty()
  tx_operation: string;

  @IsString()
  @IsCoinType()
  @IsNotEmpty()
  coin_type: string;

  @IsBoolean()
  @IsOptional()
  referral_earnings?: boolean = false;

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
