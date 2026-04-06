export interface ProviderPreset {
  id: string;
  name: string;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
  helpText?: string;
  helpLink?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'gmail',
    name: 'Gmail / Google Workspace',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapTls: true,
    helpText: 'Requires an App Password if 2-Step Verification is enabled.',
    helpLink: 'https://myaccount.google.com/apppasswords',
  },
  {
    id: 'outlook',
    name: 'Outlook / Office 365',
    imapHost: 'outlook.office365.com',
    imapPort: 993,
    imapTls: true,
    helpText: 'May require an App Password or Admin consent depending on your organization settings.',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    imapHost: 'imap.mail.yahoo.com',
    imapPort: 993,
    imapTls: true,
    helpText: 'Requires a 3rd party app password generated from Yahoo Account Security settings.',
  },
  {
    id: 'icloud',
    name: 'iCloud Mail',
    imapHost: 'imap.mail.me.com',
    imapPort: 993,
    imapTls: true,
    helpText: 'Requires generating an App-specific password.',
    helpLink: 'https://appleid.apple.com/account/manage',
  },
  {
    id: 'custom',
    name: 'Custom IMAP Provider',
    imapHost: '',
    imapPort: 993,
    imapTls: true,
  }
];
