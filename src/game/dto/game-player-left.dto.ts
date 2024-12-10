import { PartialType } from '@nestjs/mapped-types';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { GameTimerStartDto } from './game-timer-start.dto';

export class GamePlayerLeftDto extends PartialType(GameTimerStartDto) {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  winner: string;
}
