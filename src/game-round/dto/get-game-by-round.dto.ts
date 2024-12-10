import { IsString, IsNotEmpty, IsNumber, IsDefined } from 'class-validator';

export class GetGameByRoundDto {
  @IsString()
  @IsNotEmpty()
  game_id: string;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  game_round: number;
}
