import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsNotEmpty()
  tenantName: string;

  @IsString()
  @Matches(/^[a-z0-9-]{3,50}$/, { message: 'Slug must be lowercase alphanumeric with hyphens, 3-50 chars' })
  @IsNotEmpty()
  slug: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsNotEmpty()
  adminFullName: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  defaultCurrency?: string;

  @IsEnum(['en', 'sq', 'it'])
  @IsOptional()
  defaultLanguage?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}
