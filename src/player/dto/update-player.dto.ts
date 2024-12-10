/* eslint-disable prettier/prettier */
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { GenderEnum, IsOlderThan } from 'src/admin/users/dto/create-user.dto';

export class UpdatePlayerDto {

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  profile_img?: string;

  @IsEnum(GenderEnum)
  @IsOptional()
  readonly gender?: GenderEnum;

  @IsString()
  @IsOptional()
  readonly referred_by?: string;

  @IsDateString()
  @IsOptional()
  @IsOlderThan(18, { message: 'User must be 18 years or older.' })
  readonly birth_date?: string;

  @IsDateString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
