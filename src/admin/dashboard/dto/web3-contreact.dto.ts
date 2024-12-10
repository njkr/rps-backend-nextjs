import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateWeb3ContractDto {
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsArray()
  @IsNotEmpty()
  abi: Array<any>;

  @IsString()
  @IsNotEmpty()
  private_key: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;

  @IsString()
  @IsNotEmpty()
  withdraw_event: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  deposit_event: string;

  @IsDateString()
  @IsOptional()
  date?: string = new Date().toISOString();
}

export class UpdateWeb3ContractDto extends PartialType(CreateWeb3ContractDto) {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsDateString()
  @IsOptional()
  date: string;
}
