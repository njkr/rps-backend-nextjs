/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';


export class GetRequestsWithUserDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;
}
