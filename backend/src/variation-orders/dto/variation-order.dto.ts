import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BoqUnit } from '@prisma/client';

export enum VoItemAction {
  ADD = 'ADD',
  MODIFY = 'MODIFY',
}

export class CreateVoItemDto {
  @IsEnum(VoItemAction)
  action: VoItemAction;

  @IsOptional()
  @IsString()
  boqItemId?: string; // Required for MODIFY

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
}

export class CreateVariationOrderDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateVoItemDto)
  items: CreateVoItemDto[];
}

export class UpdateVariationOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateVoItemDto)
  items?: CreateVoItemDto[];
}

export class QueryVoDto {
  @IsOptional()
  @IsString()
  status?: string;

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
