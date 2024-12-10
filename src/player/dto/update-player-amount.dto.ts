/* eslint-disable prettier/prettier */
import { IsString, IsOptional, IsNumber, IsDateString, IsNotEmpty, Min } from 'class-validator';
import { IsCoinType } from 'src/common/decorators/is-coin-type.decorator';
import { IsTransactionOperation } from 'src/common/decorators/is-transaction-operation.decorator';

export class UpdatePlayerAmountDto {

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

    @IsDateString()
    @IsOptional()
    updated_date?: string = new Date().toISOString();
}
