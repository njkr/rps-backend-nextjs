import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CurrencyRateDto {
  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsNumber()
  @IsNotEmpty()
  rate: number;

  @IsNumber()
  @IsNotEmpty()
  fees_percentage: number;
}
