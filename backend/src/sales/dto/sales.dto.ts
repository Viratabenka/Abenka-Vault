import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalesAllocationItemDto {
  /** User id (CUID or any non-empty string). */
  @IsString()
  @MinLength(1, { message: 'userId is required' })
  userId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  contributionPercent: number;
}

export class CreateSalesDto {
  @IsOptional()
  @IsString()
  periodMonth?: string;

  @IsString()
  entryDate: string;

  @IsNumber()
  @Min(0)
  salesAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => SalesAllocationItemDto)
  allocations: SalesAllocationItemDto[];
}

export class UpdateSalesDto {
  @IsOptional()
  @IsString()
  periodMonth?: string;

  @IsOptional()
  @IsString()
  entryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesAllocationItemDto)
  allocations?: SalesAllocationItemDto[];
}
