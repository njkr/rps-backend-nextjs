import {
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

enum RewardType {
  GAME = 'game',
  JACKPOT = 'jackpot',
  TICKETS = 'tickets',
  MARKETPLACE = 'marketplace',
}

enum Status {
  PENDING = 'pending',
  EXPIRED = 'expired',
  VALID = 'valid',
}

export class UpdateRewardDto {
  @IsEnum(RewardType, {
    message:
      'Invalid rewards type. Allowed values are game, jackpot, tickets or marketplace.',
  })
  @IsOptional()
  reward_type: RewardType;

  @IsString()
  @IsOptional()
  source_id: string;

  @IsDateString()
  @IsOptional()
  date: string;

  @IsDateString()
  @IsOptional()
  expire_date: string;

  @IsEnum(Status, {
    message: 'Invalid status. Allowed values are pending, expired or valid.',
  })
  @IsOptional()
  status: Status;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount: number;
}
