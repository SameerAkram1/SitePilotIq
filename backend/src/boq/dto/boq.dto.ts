import { IsString, IsNumber, IsPositive, IsEnum, IsOptional, IsArray, ValidateNested, Min, MaxLength, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { BoqUnit } from '@prisma/client';
import { UNIT_DIMENSIONS } from '../../common/utils/finance-utils';

export class CreateBoqItemDto {
  @IsString()
  @MaxLength(50)
  itemCode: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsEnum(BoqUnit)
  unit: BoqUnit;

  @IsNumber()
  @IsPositive()
  estimatedQty: number;

  @IsNumber()
  @IsPositive()
  unitRate: number;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class BulkCreateBoqItemDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateBoqItemDto)
  items: CreateBoqItemDto[];
}

export class UpdateBoqItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(BoqUnit)
  unit?: BoqUnit;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimatedQty?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitRate?: number;

  @IsOptional()
  @IsString()
  sectionId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class QueryBoqDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
