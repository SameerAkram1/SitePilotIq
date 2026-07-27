import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreatePartnerNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  noteText: string;
}
