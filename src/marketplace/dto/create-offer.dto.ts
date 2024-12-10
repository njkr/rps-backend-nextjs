/* eslint-disable prettier/prettier */
import {
  IsString,
  Min,
  IsOptional,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { isMarketplaceStatus } from 'src/common/decorators/is-marketplace-status.decorator';
import { isMarketplaceType } from 'src/common/decorators/is-marketplace-type.decorator';


export class CreateOfferDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  offer_id: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  offer_name?: string | null = null;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  offer_img?: string | null = null;

  @IsString()
  @isMarketplaceType({
    message: 'Invalid Offer Type. Allowed values are Coins or Hands or Rooms.',
  })
  @IsNotEmpty()
  type?: string = 'Coins';

  @IsString()
  @isMarketplaceStatus({
    message: 'Invalid Offer Status. Allowed values are Sold or Open or Closed.',
  })
  @IsNotEmpty()
  status?: string = 'Open';

  @IsString()
  @IsOptional()
  date?: string = new Date().toISOString();

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  offer_amount: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(10)
  offer_price: number;

  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Min(0.001)
  offer_fee?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  offer_owner: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  offer_owner_img?: string | null = null;

  @IsString()
  @IsOptional()
  updated_date?: string = new Date().toISOString();
}
