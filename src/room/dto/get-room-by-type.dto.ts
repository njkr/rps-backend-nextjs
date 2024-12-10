/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { IsRoomType } from 'src/common/decorators/is-room-type.decorator';


export class GetRoomByTypeDto {
  @IsString()
  @IsRoomType()
  @IsNotEmpty()
  roomType: string;
}
