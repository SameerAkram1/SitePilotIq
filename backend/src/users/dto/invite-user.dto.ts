import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  joiningDate?: string;
}
