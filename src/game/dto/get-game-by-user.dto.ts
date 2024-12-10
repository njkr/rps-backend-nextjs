import { IsString, IsNotEmpty } from 'class-validator';

export class GetGameByUserDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  game_id: string;
}
