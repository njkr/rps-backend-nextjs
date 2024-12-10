/* eslint-disable prettier/prettier */
import { IsString, Min, IsNotEmpty, IsNumber, IsDefined } from 'class-validator';

export class AddJackpotTicketDto {

    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    first_player_ticket_amount?: number = 0;

    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    second_player_ticket_amount?: number = 0;

    @IsString()
    @IsNotEmpty()
    @IsDefined()
    first_player: string;

    @IsString()
    @IsNotEmpty()
    @IsDefined()
    second_player: string;

    @IsString()
    @IsNotEmpty()
    game_id: string;

    @IsString()
    @IsNotEmpty()
    @IsDefined()
    winner: string;
}
