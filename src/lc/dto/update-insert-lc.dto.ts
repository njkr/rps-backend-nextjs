import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

enum SourceType {
  ROOM = 'Room',
  AI = 'AI',
  MARKETPLACE = 'Marketplace',
}

export class UpdateInsertLcDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  source_id: string;

  @IsEnum(SourceType, {
    message: 'Invalid source. Allowed values are Room, AI or Marketplace.',
  })
  @IsNotEmpty()
  @IsDefined()
  source: SourceType;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  @Type(() => Number)
  amount: number;

  @IsDateString()
  @IsOptional()
  date: string;
}
