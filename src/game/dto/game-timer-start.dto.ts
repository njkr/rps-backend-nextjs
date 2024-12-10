import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class GameTimerStartDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  game_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  first_player: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  second_player: string;
}
