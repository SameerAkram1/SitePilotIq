import { IsString, IsNumber, Min, Max, IsOptional, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QrPayloadDto {
  @IsString()
  siteId: string;

  @IsString()
  tenantId: string;

  @IsString()
  token: string;

  @IsString()
  sig: string;
}

export class CheckInDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QrPayloadDto)
  qrPayload?: QrPayloadDto;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckOutDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAttendanceDto {
  @IsString()
  siteId: string;

  @IsString()
  employeeId: string;

  @IsDateString()
  attendanceDate: string;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  checkInLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  checkInLng?: number;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  checkOutLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  checkOutLng?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAttendanceDto {
  @IsOptional()
  @IsDateString()
  attendanceDate?: string;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  checkInLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  checkInLng?: number;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  checkOutLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  checkOutLng?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AttendanceQueryDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
