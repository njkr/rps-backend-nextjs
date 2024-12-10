/* eslint-disable prettier/prettier */
import {
    IsString,
    IsNotEmpty,
} from 'class-validator';

import { IsTransactionSourceType } from 'src/common/decorators/is-transaction-source-type.decorator';


export class GetTransactionsSourceDto {

    @IsString()
    @IsTransactionSourceType()
    @IsNotEmpty()
    source_type: string;

    @IsString()
    @IsNotEmpty()
    source_id: string;

}
