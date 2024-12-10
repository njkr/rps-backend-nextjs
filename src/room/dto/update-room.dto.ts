/* eslint-disable prettier/prettier */
import {
  IsString,
  Min,
  IsOptional,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { IsRoomStatus } from 'src/common/decorators/is-room-status.decorator';
import { IsRoomType } from 'src/common/decorators/is-room-type.decorator';


export class UpdateRoomDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  room_id: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Min(1)
  amount?: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  room_link?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  room_pass?: string;

  @IsString()
  @IsRoomType()
  @IsNotEmpty()
  @IsOptional()
  type?: string;

  @IsString()
  @IsRoomStatus()
  @IsNotEmpty()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  guest_id?: string | null;

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
