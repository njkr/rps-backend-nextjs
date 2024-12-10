/* eslint-disable prettier/prettier */
import {
  IsString,
  Min,
  IsOptional,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { IsRoomPassRequired } from 'src/common/decorators/is-room-pass-required.decorator';
import { IsRoomStatus } from 'src/common/decorators/is-room-status.decorator';
import { IsRoomType } from 'src/common/decorators/is-room-type.decorator';


export class CreateRoomDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  room_id: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string | null = null;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  room_link?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  room_pass?: string = null;

  @IsString()
  @IsRoomType()
  @IsRoomPassRequired({ message: 'room_pass is required when type is Private' })
  @IsNotEmpty()
  type?: string = 'Public';

  @IsString()
  @IsRoomStatus()
  @IsNotEmpty()
  status?: string = 'Pending';

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  guest_id?: string | null = null;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  user_name: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  user_email: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  user_img: string;

  @IsString()
  @IsOptional()
  date?: string = new Date().toISOString();

  @IsString()
  @IsOptional()
  updated_date?: string;
}
