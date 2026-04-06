import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  imapHost: string;

  @IsNumber()
  @IsOptional()
  imapPort?: number;

  @IsString()
  imapUser: string;

  @IsString()
  @IsOptional()
  imapPassword?: string;

  @IsBoolean()
  @IsOptional()
  imapTls?: boolean;

  @IsString()
  @IsOptional()
  imapMode?: string;

  @IsNumber()
  @IsOptional()
  imapPollInterval?: number;

  @IsString()
  mailDomain: string;

  @IsString()
  @IsOptional()
  mailBaseAddress?: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  imapHost?: string;

  @IsNumber()
  @IsOptional()
  imapPort?: number;

  @IsString()
  @IsOptional()
  imapUser?: string;

  @IsString()
  @IsOptional()
  imapPassword?: string;

  @IsBoolean()
  @IsOptional()
  imapTls?: boolean;

  @IsString()
  @IsOptional()
  imapMode?: string;

  @IsNumber()
  @IsOptional()
  imapPollInterval?: number;

  @IsString()
  @IsOptional()
  mailDomain?: string;

  @IsString()
  @IsOptional()
  mailBaseAddress?: string;
}
