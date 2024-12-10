/* eslint-disable prettier/prettier */
import { IsString,  Min, IsNotEmpty, IsNumber } from 'class-validator';
import { IsCoinType } from 'src/common/decorators/is-coin-type.decorator';
import { IsSourceFee } from 'src/common/decorators/is-source-fees.decorator';

export class UpdateCompanyWalletDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number = 0;

  @IsString()
  @IsCoinType({
    message: 'Invalid coin_type. Allowed values are LC or Dollar.',
  })
  @IsNotEmpty()
  coin_type: string;

  @IsString()
  @IsSourceFee({
    message:
      'Invalid source. Allowed values are marketplace_fee or rewards_fee or jackpot_return_back.',
  })
  @IsNotEmpty()
  source?: string;

  @IsString()
  @IsNotEmpty()
  source_id?: string;
}
