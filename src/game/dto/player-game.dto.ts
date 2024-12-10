import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class PlayerGameDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  game_id: string;
}
