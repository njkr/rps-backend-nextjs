import {
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  wallet_address: string;
}
