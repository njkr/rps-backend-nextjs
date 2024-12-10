/* eslint-disable prettier/prettier */
import {
  IsString,
  Min,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Matches,
} from 'class-validator';
import { IsWalletType } from 'src/common/decorators/is-wallet-type.decorator';


export class CreateWalletDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  wallet_id: string;

  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  @Min(0)
  balance_dollar?: number = 0;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  rate_dollar?: string = '+0%';

  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  @Min(0)
  balance_lc?: number = 0;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  rate_lc?: string = '+0%';

  @IsString()
  @IsWalletType({
    message: 'Invalid Wallet Type. Allowed values are Company or Client.',
  })
  @IsNotEmpty()
  type?: string = 'Client';

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Matches(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/, {
    message: 'cardNumber must be in the format "1234 5678 9012 3456"',
  })
  cardNumber?: string | null = null;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, {
    message: 'cardExpire must be in the format "MM/YY"',
  })
  cardExpire?: string | null = null;

  @IsNumber()
  @IsOptional()
  referral_earnings: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  stripe_id?: string | null = null;

  @IsString()
  @IsOptional()
  date?: string = new Date().toISOString();

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
