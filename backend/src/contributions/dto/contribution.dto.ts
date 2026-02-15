import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { ContributionType } from '@prisma/client';

export class CreateContributionDto {
  @IsString()
  projectId: string;

  @IsEnum(ContributionType)
  type: ContributionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherPoints?: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsBoolean()
  deferToEquity?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  conversionRate?: number;
}

export class UpdateContributionDto {
  @IsOptional()
  @IsEnum(ContributionType)
  type?: ContributionType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherPoints?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsBoolean()
  deferToEquity?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  conversionRate?: number;
}
