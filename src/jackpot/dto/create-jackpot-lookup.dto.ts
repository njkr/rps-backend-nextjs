/* eslint-disable prettier/prettier */
import { IsString, IsOptional, IsNotEmpty, IsDateString, IsNumber } from 'class-validator';

export class CreateJackpotLookupDto {

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  place: string;

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
  date?: string = new Date().toISOString();

}
