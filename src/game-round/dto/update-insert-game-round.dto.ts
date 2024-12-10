import { IsDefined, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { isGameOp } from 'src/common/decorators/is-game-op.decorator';
import { isGameWinner } from 'src/common/decorators/is-game-winner.decorator';

export class UpdateInsertGameRoundDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  game_id: string;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  game_round: number;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @isGameOp()
  first_player_op: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @isGameOp()
  second_player_op: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  @isGameWinner()
  winner: string;
}
