/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { IsRoomStatus } from '../../common/decorators/is-room-status.decorator';


export class GetRoomByStatusDto {
  @IsString()
  @IsRoomStatus()
  @IsNotEmpty()
  roomStatus: string;
}
