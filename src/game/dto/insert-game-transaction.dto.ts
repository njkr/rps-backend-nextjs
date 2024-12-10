import {
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class InsertGameTransactionDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  first_player: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  second_player: string;

  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  game_id?: string;
}
