/* eslint-disable prettier/prettier */
import {
  IsString,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { IsRoomWaitingStatus } from 'src/common/decorators/is-room-status-waitingList.decorator';


export class UpdateRoomRequestDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsRoomWaitingStatus()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
