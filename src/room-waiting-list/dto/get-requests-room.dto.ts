/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';


export class GetRequestsWithRoomDto {
  @IsString()
  @IsNotEmpty()
  room_id: string;
}
