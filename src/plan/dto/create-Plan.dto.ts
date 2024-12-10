/* eslint-disable prettier/prettier */
import { IsString, Min, IsOptional, IsNotEmpty, IsInt, IsArray } from 'class-validator';
import { isPlanAction } from 'src/common/decorators/is-plan-action.decorator';
import { IsPlanFrequency } from 'src/common/decorators/is-plan-frequncy.decorator';

export class CreatePlanDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  @IsOptional()
  amount?: number | null = null;

  @IsString()
  @IsNotEmpty()
  image

  @IsString()
  @isPlanAction()
  @IsNotEmpty()
  action

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  action_source?: string[];

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  valid_tries: number;

  @IsString()
  @IsPlanFrequency()
  @IsNotEmpty()
  frequency?: string = 'Once';

  @IsString()
  @IsOptional()
  date?: string = new Date().toISOString();

  @IsString()
  @IsOptional()
  updated_date?: string = null;
}