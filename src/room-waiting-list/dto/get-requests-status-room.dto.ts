/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { IsRoomWaitingStatus } from 'src/common/decorators/is-room-status-waitingList.decorator';


export class GetRequestsWithStatusAndRoomDto {
  @IsString()
  @IsNotEmpty()
  room_id: string;

  @IsString()
  @IsRoomWaitingStatus()
  @IsNotEmpty()
  status: string;
}
