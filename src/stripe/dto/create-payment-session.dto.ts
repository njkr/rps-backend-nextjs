import {
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentSessionDto {
  @IsString()
  @IsNotEmpty()
  readonly user_id: string;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  tx_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  stripe_id: string;
}
