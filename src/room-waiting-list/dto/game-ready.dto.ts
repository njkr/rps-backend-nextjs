/* eslint-disable prettier/prettier */
import {
    IsString,
    IsNotEmpty,
    IsEnum,
} from 'class-validator';

export enum StatusType {
    Refused = 'Refused',
    Ready = 'Ready',
}

export class GameReadyDto {

    @IsString()
    @IsNotEmpty()
    game_id: string;

    @IsEnum(StatusType, {
        message: 'Invalid source. Allowed values are Ready or Refused.',
    })
    @IsString()
    @IsNotEmpty()
    status: StatusType;
}
