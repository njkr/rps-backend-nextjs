import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class LcDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  lc_id: string;
}
