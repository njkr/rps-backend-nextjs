import {
  IsDateString,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { StatusType } from 'src/room-waiting-list/dto/game-ready.dto';

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

export class InsertGameDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  source_id: string;

  @IsEnum(SourceType, {
    message: 'Invalid source. Allowed values are AI or Room.',
  })
  @IsNotEmpty()
  @IsDefined()
  source_type: SourceType; // Enum for AI, Room

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  first_player: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  second_player: string;

  @IsOptional()
  @IsDateString()
  @IsNotEmpty()
  @IsDefined()
  date?: string = new Date().toISOString(); // ISO 8601 date string

  @IsOptional()
  @IsString()
  winner?: string = 'null';

  @IsOptional()
  @IsNumber()
  first_player_result?: number = 0;

  @IsOptional()
  @IsNumber()
  second_player_result?: number = 0;

  @IsOptional()
  @IsNumber()
  draw_result?: number = 0;

  @IsOptional()
  @IsNumber()
  first_player_ticket?: number = 0;

  @IsOptional()
  @IsNumber()
  second_player_ticket?: number = 0;

  @IsOptional()
  @IsString()
  first_player_name?: string = '';

  @IsOptional()
  @IsString()
  second_player_name?: string = '';

  @IsOptional()
  @IsString()
  first_player_image: string = '';

  @IsOptional()
  @IsString()
  second_player_image: string = '';

  @IsOptional()
  @IsNumber()
  win_dollar?: number = 0;

  @IsOptional()
  @IsNumber()
  win_lc?: number = 0;

  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsEnum(GameStatus, {
    message: 'Invalid status. Allowed values are playing, finished or refused.',
  })
  @IsOptional()
  first_player_status: GameStatus | StatusType = GameStatus.Pending; // Enum for Playing, Finished, Refused

  @IsEnum(GameStatus, {
    message: 'Invalid status. Allowed values are playing, finished or refused.',
  })
  @IsOptional()
  second_player_status: GameStatus | StatusType = GameStatus.Pending; // Enum for Playing, Finished, Refused
}
