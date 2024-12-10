/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { isMarketplaceStatus } from 'src/common/decorators/is-marketplace-status.decorator';


export class GetOfferByStatusDto {
  @IsString()
  @isMarketplaceStatus({
    message: 'Invalid Offer Status. Allowed values are Sold or Open or Closed.',
  })
  @IsNotEmpty()
  offerStatus: string;
}
