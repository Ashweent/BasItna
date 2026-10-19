import crypto from 'node:crypto';

export type VerificationPurpose = 'IDENTITY_VERIFICATION' | 'AGE_18_PLUS';

export const VALID_PURPOSES: readonly VerificationPurpose[] = ['IDENTITY_VERIFICATION', 'AGE_18_PLUS'];

export function isValidPurpose(value: unknown): value is VerificationPurpose {
  return typeof value === 'string' && (VALID_PURPOSES as readonly string[]).includes(value);
}

export const MIN_TTL_SECONDS = 60; // 1 minute
export const MAX_TTL_SECONDS = 24 * 3600; // 24 hours (proposal: "for example, 24 hours")

export interface NadraCitizen {
  cnic: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'O';
  isAlive: boolean;
  city: string;
}

export interface TokenRecord {
  token: string;
  identityHmac: string;
  organizationId: string;
  organizationName: string;
  purpose: VerificationPurpose;
  proofResult: string; // "Identity Verified" or "18+ Verified"
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  /** HMAC over token|org|purpose|proof|expiry - makes the binding tamper-evident. */
  signature?: string;
}

export interface VerificationResult {
  valid: boolean;
  status:
    | 'SUCCESS'
    | 'EXPIRED'
    | 'ALREADY_USED'
    | 'AUDIENCE_MISMATCH'
    | 'PURPOSE_MISMATCH'
    | 'TOKEN_NOT_FOUND'
    | 'INVALID_SIGNATURE'
    | 'UNAUTHORIZED';
  message: string;
  proofResult?: string;
  organizationName?: string;
  purpose?: string;
  verifiedAt?: number;
}

/**
 * Normalizes a CNIC string by stripping non-digits and ensuring standard 13-digit format XXXXX-XXXXXXX-X
 */
export function normalizeCnic(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 13) {
    return raw.trim();
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/**
 * Validates whether string is a valid Pakistani CNIC format (13 digits)
 */
export function isValidCnic(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 13;
}

/**
 * Generates an HMAC-SHA256 of the CNIC using a secret key kept strictly outside the database.
 * This prevents offline rainbow table and dictionary attacks even if the database leaks.
 */
export function generateIdentityHmac(cnic: string, secretKey: string): string {
  const normalized = normalizeCnic(cnic);
  return crypto.createHmac('sha256', secretKey).update(normalized).digest('hex');
}

/** Derives an independent sub-key from the master secret (domain separation). */
export function deriveKey(masterSecret: string, label: string): string {
  return crypto.createHmac('sha256', masterSecret).update(`basitna:${label}`).digest('hex');
}

/** Constant-time string comparison (safe for secrets of different length). */
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Per-organization API key that an organization must present to redeem tokens. */
export function deriveOrgApiKey(organizationId: string, orgKeySecret: string): string {
  return `bik_${crypto.createHmac('sha256', orgKeySecret).update(`org:${organizationId}`).digest('hex').slice(0, 32)}`;
}

/** Clamps a requested TTL (hours) to the allowed window. Default = 24h. */
export function clampTtlSeconds(requestedHours: unknown): number {
  const hours = Number(requestedHours);
  if (!Number.isFinite(hours) || hours <= 0) return MAX_TTL_SECONDS;
  return Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, Math.round(hours * 3600)));
}

// Unambiguous alphabet (no 0/O/1/I) -> tokens like BI-8F29-X72P
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomGroup(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += TOKEN_ALPHABET[crypto.randomInt(TOKEN_ALPHABET.length)];
  }
  return out;
}

/**
 * Generates a verification token formatted like BI-8F29-X72P.
 * Uses a CSPRNG (crypto.randomInt) over a 32-char alphabet. Brute-force is further limited by
 * per-organization authentication + rate limiting on the verify endpoint.
 */
export function generateTokenCode(): string {
  return `BI-${randomGroup(4)}-${randomGroup(4)}`;
}

export function signToken(
  rec: Pick<TokenRecord, 'token' | 'organizationId' | 'purpose' | 'proofResult' | 'expiresAt'>,
  signingKey: string
): string {
  return crypto
    .createHmac('sha256', signingKey)
    .update(`${rec.token}|${rec.organizationId}|${rec.purpose}|${rec.proofResult}|${rec.expiresAt}`)
    .digest('hex');
}

/**
 * Creates an audience-bound, purpose-bound, short-lived token.
 * If `signingKey` is given the record carries a tamper-evident signature.
 */
export function createVerificationToken(params: {
  identityHmac: string;
  organizationId: string;
  organizationName: string;
  purpose: VerificationPurpose;
  proofResult: string;
  ttlSeconds?: number;
  currentTime?: number;
  signingKey?: string;
}): TokenRecord {
  const now = params.currentTime ?? Date.now();
  const ttlSeconds = Math.min(MAX_TTL_SECONDS, params.ttlSeconds ?? MAX_TTL_SECONDS);
  const record: TokenRecord = {
    token: generateTokenCode(),
    identityHmac: params.identityHmac,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    purpose: params.purpose,
    proofResult: params.proofResult,
    createdAt: now,
    expiresAt: now + ttlSeconds * 1000,
    used: false,
  };
  if (params.signingKey) {
    record.signature = signToken(record, params.signingKey);
  }
  return record;
}

/**
 * Verifies an incoming token against the checking organization, purpose, and time.
 * Enforces signature (if key supplied), audience binding, purpose binding, expiry and single-use.
 */
export function verifyAudienceToken(
  tokenRecord: TokenRecord | null | undefined,
  checkingOrgId: string,
  checkingPurpose: VerificationPurpose,
  currentTime?: number,
  signingKey?: string
): VerificationResult {
  const now = currentTime ?? Date.now();

  if (!tokenRecord) {
    return {
      valid: false,
      status: 'TOKEN_NOT_FOUND',
      message: 'Token does not exist or has been deleted.',
    };
  }

  if (signingKey) {
    const expected = signToken(tokenRecord, signingKey);
    if (!tokenRecord.signature || !safeEqual(tokenRecord.signature, expected)) {
      return {
        valid: false,
        status: 'INVALID_SIGNATURE',
        message: 'Token record failed integrity check (signature mismatch).',
      };
    }
  }

  if (tokenRecord.organizationId.trim().toLowerCase() !== String(checkingOrgId).trim().toLowerCase()) {
    return {
      valid: false,
      status: 'AUDIENCE_MISMATCH',
      message: `Audience mismatch: This token was bound exclusively to "${tokenRecord.organizationName}" and cannot be redeemed by another organization.`,
      organizationName: tokenRecord.organizationName,
      purpose: tokenRecord.purpose,
    };
  }

  if (tokenRecord.purpose !== checkingPurpose) {
    return {
      valid: false,
      status: 'PURPOSE_MISMATCH',
      message: `Purpose mismatch: This token was issued for "${tokenRecord.purpose}", but organization requested "${checkingPurpose}".`,
      organizationName: tokenRecord.organizationName,
      purpose: tokenRecord.purpose,
    };
  }

  if (now > tokenRecord.expiresAt) {
    return {
      valid: false,
      status: 'EXPIRED',
      message: `Token expired at ${new Date(tokenRecord.expiresAt).toISOString()} (validity window exceeded).`,
      organizationName: tokenRecord.organizationName,
      purpose: tokenRecord.purpose,
    };
  }

  if (tokenRecord.used) {
    return {
      valid: false,
      status: 'ALREADY_USED',
      message: `Token has already been consumed at ${new Date(tokenRecord.usedAt || tokenRecord.createdAt).toISOString()}. Re-submission is prohibited.`,
      organizationName: tokenRecord.organizationName,
      purpose: tokenRecord.purpose,
    };
  }

  // Mark consumed (caller must persist this atomically via store.markTokenUsed)
  tokenRecord.used = true;
  tokenRecord.usedAt = now;

  return {
    valid: true,
    status: 'SUCCESS',
    message: 'Verification successful. Proof validated with zero personal data disclosure.',
    proofResult: tokenRecord.proofResult,
    organizationName: tokenRecord.organizationName,
    purpose: tokenRecord.purpose,
    verifiedAt: now,
  };
}

/**
 * Calculates whether a citizen is 18+ from YYYY-MM-DD
 */
export function calculateIs18Plus(dobString: string, currentDate = new Date()): boolean {
  const dob = new Date(dobString);
  let age = currentDate.getFullYear() - dob.getFullYear();
  const m = currentDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && currentDate.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

/**
 * Counts string values in arbitrary stored data that contain a raw CNIC (13 digits, optionally hyphenated).
 * Only strings are scanned (numeric epoch-ms timestamps are also 13 digits and must not count), and
 * 64-char hex HMACs never match because the lookarounds forbid adjacent alphanumerics.
 */
export function countCnicLikeValues(data: unknown): number {
  const re = /(?<![0-9A-Za-z])(\d{5}-\d{7}-\d|\d{13})(?![0-9A-Za-z])/g;
  let count = 0;
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      count += (v.match(re) ?? []).length;
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === 'object') {
      Object.values(v as Record<string, unknown>).forEach(walk);
    }
  };
  walk(data);
  return count;
}
