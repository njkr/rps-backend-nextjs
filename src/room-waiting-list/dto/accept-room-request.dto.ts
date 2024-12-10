/* eslint-disable prettier/prettier */
import {
    IsString,
    IsNotEmpty,
} from 'class-validator';

export class AcceptRoomRequestDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsString()
    @IsNotEmpty()
    room_id: string;
}
