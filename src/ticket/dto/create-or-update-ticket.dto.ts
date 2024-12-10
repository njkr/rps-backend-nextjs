import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateOrUpdateTicketDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  jackpot_id: string;

  @IsString()
  @IsNotEmpty()
  game_id: string;
}
