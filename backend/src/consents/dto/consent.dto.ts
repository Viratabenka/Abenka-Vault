import { IsString } from 'class-validator';

export class CreateConsentDto {
  @IsString()
  documentKey: string;
}
