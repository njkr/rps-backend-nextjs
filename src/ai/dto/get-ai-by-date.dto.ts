import { IsDateString, IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class GetAiByDateDto {
  @IsDateString()
  @IsNotEmpty()
  @IsDefined()
  date?: string; // Partition Key (PK)

  @IsString()
  @IsNotEmpty()
  user_id: string; // Sort Key (SK)
}
