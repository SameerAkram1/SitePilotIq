import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateProjectCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;
}

export class UpdateProjectCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}
