/* eslint-disable prettier/prettier */
import { IsString, Min, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';
import { isJackpotStatus } from 'src/common/decorators/is-jackpot-status.decorator';

export class CreateJackpotDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  id?: string;

  @IsString()
  @isJackpotStatus({
    message:
      'Invalid Jackpot Status. Allowed values are Expired or Open or Closed.',
  })
  @IsNotEmpty()
  status?: string = 'Closed';

  @IsString()
  @IsOptional()
  start_date?: string = new Date().toISOString();

  @IsString()
  @IsOptional()
  expire_date?: string | null = null;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount?: number = 0;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  no_to_open: number = 0;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  total_of_tickets?: number = 0;

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
