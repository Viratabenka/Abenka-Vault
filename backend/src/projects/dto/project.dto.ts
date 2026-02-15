import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  /** Monthly revenue in pipeline (phase-wise target). Only Admin/Accountant can set. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRevenuePipeline?: number;
}
