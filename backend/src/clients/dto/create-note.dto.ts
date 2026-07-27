import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString, MinLength, MaxLength } from 'class-validator';
import { NoteType, NoteStatus, NotePriority } from '@prisma/client';

export class CreateClientNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsEnum(NoteType)
  type: NoteType;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsEnum(NoteStatus)
  @IsOptional()
  status?: NoteStatus;

  @IsEnum(NotePriority)
  @IsOptional()
  priority?: NotePriority;

  @IsDateString()
  @IsOptional()
  noteDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isReminder?: boolean;

  @IsDateString()
  @IsOptional()
  reminderDate?: string;
}
