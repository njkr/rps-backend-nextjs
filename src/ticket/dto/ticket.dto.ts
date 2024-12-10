import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class TicketDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  ticket_id: string;
}
