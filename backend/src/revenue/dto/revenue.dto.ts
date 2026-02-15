import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { RevenueEntryType } from '@prisma/client';

export class CreateRevenueEntryDto {
  @IsString()
  projectId: string;

  @IsEnum(RevenueEntryType)
  type: RevenueEntryType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  periodMonth?: string; // YYYY-MM for monthly revenue

  @IsDateString()
  entryDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRevenueEntryDto {
  @IsOptional()
  @IsEnum(RevenueEntryType)
  type?: RevenueEntryType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  periodMonth?: string;

  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
