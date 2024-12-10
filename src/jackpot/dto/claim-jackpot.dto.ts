/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty } from 'class-validator';

export class ClaimJackpotDto {

    @IsString()
    @IsNotEmpty()
    ticket_id: string;

}