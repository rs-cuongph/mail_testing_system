import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { decrypt, encrypt } from '../utils/crypto.util';

type CredentialResponseMessage = {
  type: 'credential:response';
  requestId: string;
  ok: boolean;
  result?: string;
  error?: string;
};

@Injectable()
export class CredentialBridgeService {
  private readonly logger = new Logger(CredentialBridgeService.name);
  private readonly pendingRequests = new Map<
    string,
    {
      resolve: (value: string | null) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();

  constructor() {
    process.on?.('message', (message: CredentialResponseMessage) => {
      if (!message || message.type !== 'credential:response') {
        return;
      }

      const pending = this.pendingRequests.get(message.requestId);
      if (!pending) {
        return;
      }

      clearTimeout(pending.timer);
      this.pendingRequests.delete(message.requestId);

      if (message.ok) {
        pending.resolve(message.result ?? null);
      } else {
        pending.reject(new Error(message.error ?? 'Credential bridge request failed'));
      }
    });
  }

  async getPassword(credentialKey?: string | null) {
    if (!credentialKey) {
      return null;
    }

    if (this.isLegacyCredential(credentialKey)) {
      return decrypt(credentialKey.slice('legacy:'.length));
    }

    return this.sendRequest('credential:get', { credentialKey });
  }

  async savePassword(password: string, existingCredentialKey?: string | null) {
    if (!password) {
      throw new Error('Password is required');
    }

    if (!this.hasBridge()) {
      return `legacy:${encrypt(password)}`;
    }

    const credentialKey = await this.sendRequest('credential:set', {
      credentialKey: existingCredentialKey ?? null,
      password,
    });

    if (!credentialKey) {
      throw new Error('Credential bridge did not return a credential key');
    }

    return credentialKey;
  }

  async deletePassword(credentialKey?: string | null) {
    if (!credentialKey || this.isLegacyCredential(credentialKey)) {
      return;
    }

    await this.sendRequest('credential:delete', { credentialKey });
  }

  private hasBridge() {
    return typeof process.send === 'function' && Boolean(process.connected);
  }

  private isLegacyCredential(credentialKey: string) {
    return credentialKey.startsWith('legacy:');
  }

  private sendRequest(
    type: 'credential:get' | 'credential:set' | 'credential:delete',
    payload: Record<string, string | null>,
  ) {
    if (!this.hasBridge()) {
      throw new Error('Electron credential bridge is unavailable');
    }

    const requestId = randomUUID();

    return new Promise<string | null>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Credential bridge timeout for ${type}`));
      }, 5000);

      this.pendingRequests.set(requestId, { resolve, reject, timer });

      try {
        process.send?.({ type, requestId, ...payload });
      } catch (error) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        this.logger.error(`Credential bridge send failed: ${(error as Error).message}`);
        reject(error as Error);
      }
    });
  }
}
