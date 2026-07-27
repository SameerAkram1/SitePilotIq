import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @IsOptional()
  companyName?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  vatNumber?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  taxId?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  registrationNumber?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  street?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  state?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  defaultCurrency?: string;

  @IsString()
  @MaxLength(34)
  @IsOptional()
  iban?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  bankName?: string;

  @IsString()
  @MaxLength(11)
  @IsOptional()
  swiftBic?: string;

  @IsEnum(['en', 'sq', 'it'])
  @IsOptional()
  defaultLanguage?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
  @IsOptional()
  dateFormat?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  defaultVatRate?: number;
}
