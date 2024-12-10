/* eslint-disable prettier/prettier */
// src/players/dto/update-player.dto.ts

import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class InsertPlayerDto {
  @IsString()
  @IsNotEmpty()
  readonly user_id: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly email: string;

  @IsString()
  @IsOptional()
  profile_img: string | null = null;

  @IsNumber()
  @IsOptional()
  total_of_tickets: number = 0;

  @IsNumber()
  @IsOptional()
  number_of_games: number = 0;

  @IsNumber()
  @IsOptional()
  total_of_wins: number = 0;

  @IsDateString()
  @IsOptional()
  stripe_customer_id?: string | null = null;

  @IsDateString()
  @IsOptional()
  last_game_date?: string | null = null;

  @IsDateString()
  @IsOptional()
  created_date?: string = new Date().toISOString();

  @IsDateString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
