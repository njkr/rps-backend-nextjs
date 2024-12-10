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
import { IsTransactionSourceType } from 'src/common/decorators/is-transaction-source-type.decorator';
import { IsTransactionStatus } from 'src/common/decorators/is-transaction-status.decorator';
import { IsTransactionType } from 'src/common/decorators/is-transaction-type.decorator';


export class CreateTransactionDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  tx_id?: string;

  @IsString()
  @IsTransactionType()
  @IsNotEmpty()
  tx_type: string;

  @IsString()
  @IsTransactionOperation()
  @IsNotEmpty()
  tx_operation: string;

  @IsString()
  @IsCoinType()
  @IsNotEmpty()
  coin_type: string;

  @IsString()
  @IsTransactionStatus()
  @IsOptional()
  @IsNotEmpty()
  tx_status?: string = 'Success';

  @IsNumber()
  @IsOptional()
  @Min(0)
  tx_fee?: number = null;

  @IsString()
  @IsCoinType()
  @IsNotEmpty()
  tx_fee_coin_type?: string = null;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  @IsTransactionSourceType()
  @IsNotEmpty()
  source_type?: string;

  @IsString()
  @IsOptional()
  source_id?: string = null;

  @IsString()
  @IsOptional()
  wallet_address?: string = null;

  @IsString()
  @IsOptional()
  game_id?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Min(0)
  updated_balance?: number;

  @IsBoolean()
  @IsOptional()
  referral_earnings?: boolean = false;

  @IsString()
  @IsOptional()
  date?: string = new Date().toISOString();

}
