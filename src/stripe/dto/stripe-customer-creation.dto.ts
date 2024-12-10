import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class StripeCustomerCreationDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  readonly user_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  readonly wallet_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  readonly email: string;
}
