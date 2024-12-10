/* eslint-disable prettier/prettier */
import {
  IsString,
  Min,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Matches,
} from 'class-validator';


export class UpdateWalletDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  user_id: string;

  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  @Min(0)
  balance_dollar?: number;

  @IsNumber()
  @IsOptional()
  @IsNotEmpty()
  @Min(0)
  balance_lc?: number;



  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Matches(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/, {
    message: 'cardNumber must be in the format "1234 5678 9012 3456"',
  })
  cardNumber?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, {
    message: 'cardExpire must be in the format "MM/YY"',
  })
  cardExpire?: string;

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
