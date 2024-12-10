import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class GetRewardByIdDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  reward_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  user_id: string;
}
