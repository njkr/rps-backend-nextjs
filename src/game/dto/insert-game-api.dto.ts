import {
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class InsertGameApiDto {
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
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
