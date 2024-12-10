/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty } from 'class-validator';

export class ReferralPlayerDto {

    @IsString()
    @IsNotEmpty()
    referred_by: string;

}
