import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CalculateEquityDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  vestingStart: string;

  @IsInt()
  @Min(0)
  cliffMonths: number;

  @IsInt()
  @Min(1)
  vestingMonths: number;
}
