import { IsNotEmpty, IsString } from 'class-validator';

export class ApproveTransactionDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  tx_id: string;
}
