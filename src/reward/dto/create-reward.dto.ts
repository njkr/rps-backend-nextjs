import {
  IsString,
  IsNotEmpty,
  IsDefined,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

enum RewardsType {
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

export class CreateRewardDto {
  @IsString()
  @IsOptional()
  @IsDefined()
  user_id: string;

  @IsString()
  @IsOptional()
  @IsDefined()
  reward_id: string;

  @IsEnum(RewardsType, {
    message:
      'Invalid rewards type. Allowed values are game, jackpot, tickets or marketplace.',
  })
  @IsNotEmpty()
  @IsDefined()
  reward_type: RewardsType;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  source_id: string;

  @IsDateString()
  @IsNotEmpty()
  @IsDefined()
  date: string;

  @IsDateString()
  @IsNotEmpty()
  @IsDefined()
  expire_date: string;

  @IsEnum(Status, {
    message: 'Invalid status. Allowed values are pending, expired or valid.',
  })
  @IsNotEmpty()
  @IsDefined()
  status: Status;

  @IsNumber()
  @Min(0)
  @IsDefined()
  amount: number;
}
