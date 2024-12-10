/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { isJackpotStatus } from 'src/common/decorators/is-jackpot-status.decorator';

export class UpdateJackpotStatusDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  @isJackpotStatus({
    message:
      'Invalid Jackpot Status. Allowed values are Expired or Open or Closed.',
  })
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  expire_date?: string | null = null;

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
