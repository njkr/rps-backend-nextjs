import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class GameRoundDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  round_id: string;
}
