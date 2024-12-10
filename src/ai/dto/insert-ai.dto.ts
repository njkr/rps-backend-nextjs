import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class InsertAiDto {
  @IsString()
  @IsNotEmpty()
  id: string; // Sort Key (SK)

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  plan_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  plan_action_source: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  available_plan_action_source?: string[];

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== undefined ? value : 0))
  no_tries: number = 0;

  @IsNumber()
  @IsNotEmpty()
  remaining_tries: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value !== undefined ? value : false))
  is_active?: boolean = false;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  updated_date?: string;
}
