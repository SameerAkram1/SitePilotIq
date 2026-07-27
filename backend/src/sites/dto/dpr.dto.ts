import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsDateString } from 'class-validator';

export class CreateDprDto {
  @IsDateString()
  @IsNotEmpty()
  reportDate: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  narrative: string;

  @IsString()
  @IsOptional()
  weather?: string;

  @IsString()
  @IsOptional()
  temperature?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  workersOnSite?: number;

  @IsString()
  @IsOptional()
  equipmentOnSite?: string;

  @IsString()
  @IsNotEmpty()
  workCompleted: string;

  @IsString()
  @IsNotEmpty()
  workPlanned: string;

  @IsString()
  @IsOptional()
  issuesRisks?: string;
}

export class UpdateDprDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  narrative?: string;

  @IsString()
  @IsOptional()
  weather?: string;

  @IsString()
  @IsOptional()
  temperature?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  workersOnSite?: number;

  @IsString()
  @IsOptional()
  equipmentOnSite?: string;

  @IsString()
  @IsOptional()
  workCompleted?: string;

  @IsString()
  @IsOptional()
  workPlanned?: string;

  @IsString()
  @IsOptional()
  issuesRisks?: string;
}
