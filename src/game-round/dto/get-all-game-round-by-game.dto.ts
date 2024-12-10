import { IsString, IsNotEmpty } from 'class-validator';

export class GetAllGameRoundByGameDto {
  @IsString()
  @IsNotEmpty()
  game_id: string;
}
