import { IsString, IsDateString, IsOptional, IsNumber, IsBoolean, IsEnum, ValidateNested, IsArray, Min, MaxLength, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { IpcStatus } from '@prisma/client';

export class CreateIpcDto {
  @IsDateString()
  billingStartDate: string;

  @IsDateString()
  billingEndDate: string;

  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;

  @IsOptional()
  @IsBoolean()
  isMbLinked?: boolean;
}

export class UpdateIpcLineItemDto {
  @IsString()
  boqItemId: string;

  @IsNumber()
  @Min(0)
  currentQuantity: number;

  @IsOptional()
  @IsNumber()
  currentPercent?: number;
}

export class SubmitIpcDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => UpdateIpcLineItemDto)
  lineItems: UpdateIpcLineItemDto[];
}

export class CertifyIpcDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CertifyLineItemDto)
  lineItems: CertifyLineItemDto[];

  @IsOptional()
  @IsBoolean()
  retentionReleased?: boolean;
}

export class CertifyLineItemDto {
  @IsString()
  boqItemId: string;

  @IsNumber()
  @Min(0)
  certifiedQuantity: number;
}

export class RejectIpcDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class RecordPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class QueryIpcDto {
  @IsOptional()
  @IsEnum(IpcStatus)
  status?: IpcStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
