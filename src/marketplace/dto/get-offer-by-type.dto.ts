/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { isMarketplaceType } from 'src/common/decorators/is-marketplace-type.decorator';


export class GetOfferByTypeDto {
  @IsString()
  @isMarketplaceType({
    message: 'Invalid Offer Type. Allowed values are Coins or Hands or Rooms.',
  })
  @IsNotEmpty()
  offerType: string;
}
