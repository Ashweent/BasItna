import crypto from 'node:crypto';
import { deriveKey } from './crypto.js';

export interface AppConfig {
  isProduction: boolean;
  demoMode: boolean;
  adminApiKey?: string;
  identityKey: string; // HMAC key for CNIC -> identity hash
  tokenSigningKey: string; // HMAC key for token signatures
  orgKeySecret: string; // secret used to derive per-organization API keys
  secretSource: 'environment' | 'ephemeral-dev';
}

/**
 * Loads secrets from the environment ONLY. There is no hardcoded fallback:
 *  - production: BASITNA_HMAC_SECRET is mandatory (process exits if missing/short)
 *  - development: a random per-process secret is generated (identities change on restart)
 * Call AFTER dotenv.config().
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const isProduction = env.NODE_ENV === 'production';
  let master = env.BASITNA_HMAC_SECRET;
  let secretSource: AppConfig['secretSource'] = 'environment';

  if (!master || master.length < 32) {
    if (isProduction) {
      throw new Error('BASITNA_HMAC_SECRET is required in production and must be at least 32 characters.');
    }
    master = crypto.randomBytes(32).toString('hex');
    secretSource = 'ephemeral-dev';
    console.warn(
      '[BasItna] BASITNA_HMAC_SECRET not set (or < 32 chars): using a random ephemeral dev secret. ' +
        'Identity hashes will not survive a restart.'
    );
  }

  return {
    isProduction,
    demoMode: !isProduction && env.DEMO_MODE !== 'false',
    adminApiKey: env.ADMIN_API_KEY || undefined,
    identityKey: deriveKey(master, 'identity-v1'),
    tokenSigningKey: deriveKey(master, 'token-signing-v1'),
    orgKeySecret: deriveKey(master, 'org-api-keys-v1'),
    secretSource,
  };
}
