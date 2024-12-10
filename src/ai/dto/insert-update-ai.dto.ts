import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class InsertUpdateAiDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  plan_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  plan_action_source: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value !== undefined ? value : 0))
  no_tries?: number = 0;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value !== undefined ? value : false))
  is_active?: boolean = false;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  updated_date?: string;
}
