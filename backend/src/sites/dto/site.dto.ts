import {
  IsString,
  IsOptional,
  IsDateString,
  IsUUID,
  IsIn,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { SiteStatus } from '@prisma/client';

export class CreateSiteDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(10000)
  locationRadius?: number;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @IsUUID()
  siteManagerId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(10000)
  locationRadius?: number;

  @IsOptional()
  @IsDateString()
  plannedEndDate?: string;

  @IsOptional()
  @IsDateString()
  actualEndDate?: string;

  @IsOptional()
  @IsUUID()
  siteManagerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  // projectId — only ADMIN can reassign (enforced in service)
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  confirmProjectReassignment?: boolean;
}

export class QuerySitesDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  @IsOptional()
  @IsUUID()
  siteManagerId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CreateSiteLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  levelType: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  sortOrder?: number;
}

export class UpdateSiteLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  levelType?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  sortOrder?: number;
}
