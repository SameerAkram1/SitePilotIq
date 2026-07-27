import { IsString, IsNumber, IsOptional, IsDateString, Min, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMbEntryDto {
  @IsString()
  boqItemId: string;

  @IsDateString()
  entryDate: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dim1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dim2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dim3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalQuantity?: number;
}

export class UpdateMbEntryDto {
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dim1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dim2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dim3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalQuantity?: number;
}

export class QueryMbDto {
  @IsOptional()
  @IsString()
  boqItemId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
