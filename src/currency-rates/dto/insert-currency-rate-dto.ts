import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CurrencyRateDto } from './currency-rate-dto';
import { PartialType } from '@nestjs/mapped-types';

export class InsertCurrencyRateDto extends PartialType(CurrencyRateDto) {
  @IsString()
  @IsNotEmpty()
  created_by: string;

  @IsOptional()
  @IsString()
  date?: string = new Date().toISOString();
}
