import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CurrencyRateDto } from './currency-rate-dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateCurrencyRateDto extends PartialType(CurrencyRateDto) {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  updated_by: string;

  @IsOptional()
  @IsString()
  updated_date?: string = new Date().toISOString();
}
