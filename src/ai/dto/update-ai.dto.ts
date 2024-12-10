import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAiDto {
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsNotEmpty()
  id: string; // Sort Key (SK)

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsString()
  @IsOptional()
  plan_action_source?: string = null;
}
