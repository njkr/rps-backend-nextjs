import { IsDateString, IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class GetAiByPlanIdDto {
  @IsString()
  @IsNotEmpty()
  user_id: string; // Partition Key (PK)

  @IsString()
  @IsNotEmpty()
  plan_id: string; // Sort Key (SK)

  @IsDateString()
  @IsNotEmpty()
  @IsDefined()
  date?: string;
}
