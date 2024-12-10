import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { isGameWinner } from 'src/common/decorators/is-game-winner.decorator';

export class EndGameRoundDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  game_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @isGameWinner()
  winner: string;
}
