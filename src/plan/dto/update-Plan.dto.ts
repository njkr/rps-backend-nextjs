/* eslint-disable prettier/prettier */
import { IsString, IsOptional } from 'class-validator';
import { CreatePlanDto } from './create-Plan.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdatePlanDto extends PartialType(CreatePlanDto) {

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();

}
