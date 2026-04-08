import { Global, Module } from '@nestjs/common';
import { CredentialBridgeService } from './credential-bridge.service';

@Global()
@Module({
  providers: [CredentialBridgeService],
  exports: [CredentialBridgeService],
})
export class CredentialsModule {}
