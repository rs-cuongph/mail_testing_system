import { IsString, IsInt, IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsNotEmpty()
  imapHost: string;

  @IsInt()
  @IsNotEmpty()
  imapPort: number;

  @IsString()
  @IsNotEmpty()
  imapUser: string;

  // Optional because on update, user might not provide a new password
  @IsString()
  @IsOptional()
  imapPassword?: string;

  @IsString()
  @IsOptional()
  credentialKey?: string;

  @IsBoolean()
  @IsNotEmpty()
  imapTls: boolean;

  @IsString()
  @IsNotEmpty()
  imapMode: string;

  @IsInt()
  @IsNotEmpty()
  imapPollInterval: number;

  @IsString()
  @IsNotEmpty()
  mailDomain: string;

  @IsString()
  @IsNotEmpty()
  mailBaseAddress: string;
}
