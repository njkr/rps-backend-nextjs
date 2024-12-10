/* eslint-disable prettier/prettier */
import {
    IsString,
    Min,
    IsOptional,
    IsNotEmpty,
    IsNumber,
} from 'class-validator';
import { IsCoinType } from 'src/common/decorators/is-coin-type.decorator';
import { IsTransactionStatus } from 'src/common/decorators/is-transaction-status.decorator';


export class UpdateTransactionStatusDto {
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    user_id: string;

    @IsString()
    @IsOptional()
    @IsNotEmpty()
    tx_id: string;

    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    amount: number;

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

    @IsString()
    @IsOptional()
    updated_date?: string = new Date().toISOString();

}
