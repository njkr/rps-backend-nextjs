/* eslint-disable prettier/prettier */
import { IsString, Min, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { isJackpotStatus } from 'src/common/decorators/is-jackpot-status.decorator';

export class UpdateJackpotDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  @isJackpotStatus({
    message:
      'Invalid jackpot Status. Allowed values are Expired or Open or Closed.',
  })
  @IsNotEmpty()
  status?: string;

  @IsString()
  @IsOptional()
  expire_date?: string | null;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount?: number = 0;

  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Min(0)
  no_to_open?: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @IsOptional()
  total_of_tickets?: number = 0;

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
