export class CreateProfileDto {
  name: string;
  provider?: string;
  imapHost: string;
  imapPort?: number;
  imapUser: string;
  imapPassword?: string;
  imapTls?: boolean;
  imapMode?: string;
  imapPollInterval?: number;
  mailDomain: string;
  mailBaseAddress?: string;
}

export class UpdateProfileDto {
  name?: string;
  provider?: string;
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPassword?: string;
  imapTls?: boolean;
  imapMode?: string;
  imapPollInterval?: number;
  mailDomain?: string;
  mailBaseAddress?: string;
}
