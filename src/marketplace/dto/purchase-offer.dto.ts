/* eslint-disable prettier/prettier */
import {
    IsString,
    IsNotEmpty,
} from 'class-validator';


export class PurchaseOfferDto {

    @IsString()
    @IsNotEmpty()
    offer_id: string;

}
