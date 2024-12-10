import {
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { InsertGameDto } from './insert-game.dto';
import { PartialType } from '@nestjs/mapped-types';

export enum SourceType {
  AI = 'AI',
  Room = 'Room',
  Game = 'Game',
}

export enum GameStatus {
  Playing = 'Playing',
  Finished = 'Finished',
  Refused = 'Refused',
  TimerElapsed = 'TimerElapsed',
  Cancelled = 'Cancelled',
  Pending = 'Pending',
  Ready = 'Ready',
}

export class UpdateGameDto extends PartialType(InsertGameDto) {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  game_id: string; // Primary Key (PK)

  @IsOptional()
  @IsDateString()
  @IsNotEmpty()
  @IsDefined()
  updated_date?: string = new Date().toISOString();
}
