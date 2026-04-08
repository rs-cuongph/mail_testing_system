import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { decrypt, encrypt } from '../utils/crypto.util';

@Injectable()
export class CredentialBridgeService {
  private readonly logger = new Logger(CredentialBridgeService.name);
  private readonly runtimeCredentials = new Map<string, string>();

  constructor() {
    const bootstrapCredentialKey = process.env.ACTIVE_IMAP_CREDENTIAL_KEY?.trim();
    const bootstrapPassword = process.env.ACTIVE_IMAP_PASSWORD?.trim();

    if (bootstrapCredentialKey && bootstrapPassword) {
      this.runtimeCredentials.set(bootstrapCredentialKey, bootstrapPassword);
      this.logger.log(`Seeded active credential ${bootstrapCredentialKey} from sidecar environment`);
    }
  }

  async getPassword(credentialKey?: string | null) {
    if (!credentialKey) {
      return null;
    }

    if (this.isLegacyCredential(credentialKey)) {
      return decrypt(credentialKey.slice('legacy:'.length));
    }

    return this.runtimeCredentials.get(credentialKey) ?? null;
  }

  async savePassword(password: string, existingCredentialKey?: string | null) {
    if (!password) {
      throw new Error('Password is required');
    }

    if (existingCredentialKey && this.isLegacyCredential(existingCredentialKey)) {
      return `legacy:${encrypt(password)}`;
    }

    const credentialKey = existingCredentialKey ?? randomUUID();
    this.runtimeCredentials.set(credentialKey, password);
    return credentialKey;
  }

  async deletePassword(credentialKey?: string | null) {
    if (!credentialKey || this.isLegacyCredential(credentialKey)) {
      return;
    }

    this.runtimeCredentials.delete(credentialKey);
  }

  async rememberPassword(
    credentialKey: string | null | undefined,
    password: string | null | undefined,
  ) {
    if (!credentialKey || !password || this.isLegacyCredential(credentialKey)) {
      return;
    }

    this.runtimeCredentials.set(credentialKey, password);
  }

  private isLegacyCredential(credentialKey: string) {
    return credentialKey.startsWith('legacy:');
  }
}
