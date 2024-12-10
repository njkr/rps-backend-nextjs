/* eslint-disable prettier/prettier */
// src/players/dto/player.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class PlayerDto {
  @IsString()
  @IsNotEmpty()
  readonly user_id: string;
}
