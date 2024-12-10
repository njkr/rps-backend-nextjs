/* eslint-disable prettier/prettier */
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
} from 'class-validator';
import { isMarketplaceStatus } from 'src/common/decorators/is-marketplace-status.decorator';
import { isMarketplaceType } from 'src/common/decorators/is-marketplace-type.decorator';


export class GetOfferByPriceTypeStatusDto {

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    offerPrice?: number;

    @IsString()
    @isMarketplaceType({
        message: 'Invalid Offer Type. Allowed values are Coins or Hands or Rooms.',
    })
    @IsOptional()
    offerType?: string;

    @IsString()
    @isMarketplaceStatus({
        message: 'Invalid Offer Status. Allowed values are Sold or Open or Closed.',
    })
    @IsOptional()
    offerStatus?: string;
}
