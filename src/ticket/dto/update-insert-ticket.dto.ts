import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum Status {
  VALID = 'Valid',
  PENDING = 'Pending',
  CLAIMED = 'Claimed',
  EXPIRED = 'Expired',
  NO_REWARD = 'NoReward',
}

export enum JackpotWinnerType {
  FIRST = 'first',
  SECOND = 'second',
  THIRD = 'third',
  FORTH = 'fourth',
  FIFTH = 'fifth',
  GUARANTEED = 'guaranteed',
}
export class UpdateInsertTicketDto {
  @IsString()
  @IsOptional()
  user_name?: string;

  @IsString()
  @IsOptional()
  jackpot_id?: string;

  @IsString()
  @IsOptional()
  game_id?: string;

  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @IsEnum(JackpotWinnerType)
  @IsNotEmpty()
  @IsDefined()
  jackpot_winner_type?: JackpotWinnerType = null;

  @IsNumber()
  @IsOptional()
  jackpot_rank?: number = null;

  @IsBoolean()
  @IsOptional()
  is_free_claimed?: boolean = false;

  @IsNumber()
  @IsOptional()
  jackpot_free_claimable_win_amount?: number = null;

  @IsNumber()
  @IsOptional()
  jackpot_claimable_win_amount?: number = null;

  @IsNumber()
  @IsOptional()
  jackpot_win_amount?: number = null;

  @IsString()
  @IsOptional()
  profile_img?: string;

  @IsDateString()
  @IsOptional()
  jackpot_draw_date?: number = null;

  @IsDateString()
  @IsOptional()
  jackpot_free_claim_date?: number = null;

  @IsDateString()
  @IsOptional()
  jackpot_claim_date?: number = null;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  updated_date?: string;
}
