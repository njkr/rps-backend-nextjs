import { IsNotEmpty, IsString } from 'class-validator';

export class AiDto {
  @IsString()
  @IsNotEmpty()
  id: string; // Sort Key (SK)

  @IsString()
  @IsNotEmpty()
  user_id: string; // Partition Key (PK)
}
