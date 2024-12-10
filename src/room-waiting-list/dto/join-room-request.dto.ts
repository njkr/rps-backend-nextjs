/* eslint-disable prettier/prettier */
import {
    IsString,
    IsOptional,
    IsNotEmpty,
} from 'class-validator';
import { IsRoomWaitingStatus } from 'src/common/decorators/is-room-status-waitingList.decorator';


export class JoinRoomRequestDto {
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    id: string;

    @IsString()
    @IsOptional()
    @IsNotEmpty()
    user_id: string;

    @IsString()
    @IsOptional()
    @IsNotEmpty()
    user_name: string;

    @IsString()
    @IsNotEmpty()
    room_id: string;

    @IsString()
    @IsNotEmpty()
    room_pass?: string;

    @IsString()
    @IsOptional()
    @IsNotEmpty()
    room_owner_id: string;

    @IsString()
    @IsOptional()
    @IsNotEmpty()
    room_name: string;

    @IsString()
    @IsRoomWaitingStatus()
    @IsNotEmpty()
    status?: string = 'Pending';

    @IsString()
    @IsOptional()
    date?: string = new Date().toISOString();

    @IsString()
    @IsOptional()
    updated_date?: string;
}
