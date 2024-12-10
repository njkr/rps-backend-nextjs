/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber } from 'class-validator';

export class UpdateJackpotLookupDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @IsNotEmpty()
  total_prize: number;

  @IsNumber()
  @IsNotEmpty()
  number_of_winners: number;

  @IsNumber()
  @IsNotEmpty()
  prize_per_winner: number;

  @IsNumber()
  @IsNotEmpty()
  total_prize_with_fee: number;

  @IsOptional()
  @IsDateString()
  updated_date?: string = new Date().toISOString();
}
