import { IsDateString, IsNotEmpty, IsOptional } from 'class-validator';

export class DateFilterDto {
  @IsDateString({ strict: true })
  @IsOptional()
  @IsNotEmpty()
  startDate?: string;

  @IsDateString({ strict: true })
  @IsOptional()
  @IsNotEmpty()
  endDate?: string;
}
