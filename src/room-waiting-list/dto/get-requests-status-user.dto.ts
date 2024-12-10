/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { IsRoomWaitingStatus } from 'src/common/decorators/is-room-status-waitingList.decorator';


export class GetRequestsWithStatusAndUserDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsRoomWaitingStatus()
  @IsNotEmpty()
  status: string;
}
