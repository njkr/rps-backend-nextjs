import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetAllGameDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit: number = 10;

  @IsOptional()
  @IsString()
  lastEvaluatedKey?: string | [string, string];
}
