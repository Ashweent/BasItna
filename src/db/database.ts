import pg from 'pg';
import { TokenRecord, VerificationPurpose, countCnicLikeValues } from '../utils/crypto.js';

export interface Organization {
  id: string;
  name: string;
  category: 'Education' | 'Healthcare' | 'Banking' | 'Real Estate' | 'Events' | 'Government';
  description: string;
  allowedPurposes: VerificationPurpose[];
  badgeColor: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: 'TOKEN_ISSUED' | 'TOKEN_VERIFIED' | 'VERIFICATION_REJECTED' | 'TOKEN_EXPIRED';
  organizationId: string;
  organizationName: string;
  purpose: string;
  tokenCode: string;
  details: string;
  status: 'SUCCESS' | 'BLOCKED' | 'FLAGGED';
}

export interface IdentityHashRecord {
  id: number;
  identityHmac: string;
  firstVerifiedAt: string;
  lastActiveAt: string;
  tokensCount: number;
}

// Registered Organizations
export const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: 'fast-nuces',
    name: 'FAST NUCES (CS Department)',
    category: 'Education',
    description: 'National University of Computer & Emerging Sciences - AI Hackathon & Workshop Gate',
    allowedPurposes: ['IDENTITY_VERIFICATION'],
    badgeColor: 'emerald',
  },
  {
    id: 'aga-khan-hospital',
    name: 'Aga Khan University Hospital',
    category: 'Healthcare',
    description: 'Patient & Visitor Access Management System',
    allowedPurposes: ['IDENTITY_VERIFICATION'],
    badgeColor: 'blue',
  },
  {
    id: 'hbl-digital',
    name: 'Habib Bank Limited (HBL Digital)',
    category: 'Banking',
    description: 'Digital Account Onboarding & Age Eligibility Gateway',
    allowedPurposes: ['IDENTITY_VERIFICATION', 'AGE_18_PLUS'],
    badgeColor: 'purple',
  },
  {
    id: 'lums-summit',
    name: 'LUMS National Leadership Summit',
    category: 'Events',
    description: 'Annual Leadership Conference Registration & Accreditation',
    allowedPurposes: ['IDENTITY_VERIFICATION'],
    badgeColor: 'amber',
  },
  {
    id: 'careem-pakistan',
    name: 'Careem Pakistan Driver Verification',
    category: 'Events',
    description: 'Ride-Hailing Driver Age & ID Gate',
    allowedPurposes: ['IDENTITY_VERIFICATION', 'AGE_18_PLUS'],
    badgeColor: 'teal',
  },
];

export const POSTGRES_SCHEMA_SQL = `
-- BasItna PostgreSQL Schema Definition
-- Strictly follows "Proof, Not Data" principles.
-- Notice: NO columns exist for raw CNIC, CNIC photos, or plain-text PII.

CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT,
    allowed_purposes VARCHAR(64)[] NOT NULL,
    badge_color VARCHAR(32) NOT NULL DEFAULT 'emerald',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS identity_hashes (
    id SERIAL PRIMARY KEY,
    identity_hmac VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 HMAC (never plain text)
    first_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tokens_count INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS verification_tokens (
    id SERIAL PRIMARY KEY,
    token_code VARCHAR(32) NOT NULL UNIQUE, -- e.g. BI-8F29-X72P
    identity_hmac VARCHAR(64) NOT NULL REFERENCES identity_hashes(identity_hmac),
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id),
    organization_name VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    proof_result VARCHAR(128) NOT NULL, -- "Identity Verified" or "18+ Verified"
    signature VARCHAR(64),              -- HMAC binding token|org|purpose|proof|expiry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    token_code VARCHAR(32) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`.trim();

export interface Store {
  readonly kind: 'postgresql' | 'memory';
  init(): Promise<void>;
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  insertToken(token: TokenRecord): Promise<void>;
  getToken(tokenCode: string): Promise<TokenRecord | undefined>;
  /** Atomically flips unused -> used. Returns false if someone else already consumed it. */
  markTokenUsed(tokenCode: string, usedAt: number): Promise<boolean>;
  getAllTokens(): Promise<TokenRecord[]>;
  getIdentityHashes(): Promise<IdentityHashRecord[]>;
  logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;
  getAuditLogs(limit?: number): Promise<AuditLogEntry[]>;
  /** Deletes tokens that expired more than `graceMs` ago (retention limit). */
  purgeExpiredTokens(graceMs?: number): Promise<number>;
  reset(): Promise<void>;
}

const normalizeCode = (code: string) => code.trim().toUpperCase();
const newLogId = () => `LOG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

/** Real measurement (not a constant): scans everything we persist for CNIC-like values. */
export async function countStoredCnics(store: Store): Promise<number> {
  const [tokens, hashes, logs] = await Promise.all([
    store.getAllTokens(),
    store.getIdentityHashes(),
    store.getAuditLogs(1000),
  ]);
  return countCnicLikeValues({ tokens, hashes, logs });
}

export async function buildDatabaseDump(store: Store) {
  const [organizations, hashes, tokens, logs, rawCnicStored] = await Promise.all([
    store.getOrganizations(),
    store.getIdentityHashes(),
    store.getAllTokens(),
    store.getAuditLogs(25),
    countStoredCnics(store),
  ]);
  return {
    storage: store.kind,
    schemaSql: POSTGRES_SCHEMA_SQL,
    organizations,
    identityHashes: hashes,
    tokens,
    auditLogs: logs,
    privacyGuarantee: {
      // Computed by scanning stored rows, NOT hardcoded.
      rawCnicStored,
      cnicImagesStored: 0, // there is no column/table/upload endpoint that could hold an image
      plainTextPiiStored: rawCnicStored,
      hmacProtectedRecords: hashes.length,
      audienceBoundTokens: tokens.length,
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory store (demo fallback when DATABASE_URL is not configured)
// ---------------------------------------------------------------------------
export class MemoryStore implements Store {
  readonly kind = 'memory' as const;
  private organizations = new Map<string, Organization>();
  private identityHashes = new Map<string, IdentityHashRecord>();
  private tokens = new Map<string, TokenRecord>();
  private auditLogs: AuditLogEntry[] = [];
  private idCounter = 1;

  async init() {
    this.seed();
  }

  private seed() {
    this.organizations.clear();
    for (const org of DEFAULT_ORGANIZATIONS) this.organizations.set(org.id, { ...org });
  }

  async getOrganizations() {
    return Array.from(this.organizations.values());
  }

  async getOrganization(id: string) {
    return this.organizations.get(id);
  }

  async insertToken(token: TokenRecord) {
    this.tokens.set(token.token, { ...token });
    const now = new Date().toISOString();
    const existing = this.identityHashes.get(token.identityHmac);
    if (existing) {
      existing.lastActiveAt = now;
      existing.tokensCount++;
    } else {
      this.identityHashes.set(token.identityHmac, {
        id: this.idCounter++,
        identityHmac: token.identityHmac,
        firstVerifiedAt: now,
        lastActiveAt: now,
        tokensCount: 1,
      });
    }
  }

  async getToken(tokenCode: string) {
    const t = this.tokens.get(normalizeCode(tokenCode));
    return t ? { ...t } : undefined; // copy: callers must persist changes explicitly
  }

  async markTokenUsed(tokenCode: string, usedAt: number) {
    const t = this.tokens.get(normalizeCode(tokenCode));
    if (!t || t.used) return false;
    t.used = true;
    t.usedAt = usedAt;
    return true;
  }

  async getAllTokens() {
    return Array.from(this.tokens.values())
      .map((t) => ({ ...t }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async getIdentityHashes() {
    return Array.from(this.identityHashes.values()).map((h) => ({ ...h }));
  }

  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const full: AuditLogEntry = { id: newLogId(), timestamp: new Date().toISOString(), ...entry };
    this.auditLogs.unshift(full);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    return full;
  }

  async getAuditLogs(limit = 200) {
    return this.auditLogs.slice(0, limit);
  }

  async purgeExpiredTokens(graceMs = 24 * 3600 * 1000) {
    const cutoff = Date.now() - graceMs;
    let n = 0;
    for (const [k, t] of this.tokens) {
      if (t.expiresAt < cutoff) {
        this.tokens.delete(k);
        n++;
      }
    }
    return n;
  }

  async reset() {
    this.identityHashes.clear();
    this.tokens.clear();
    this.auditLogs = [];
    this.idCounter = 1;
    this.seed();
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL store (used whenever DATABASE_URL is set)
// ---------------------------------------------------------------------------
export class PgStore implements Store {
  readonly kind = 'postgresql' as const;
  private pool: pg.Pool;

  constructor(connectionString: string, useSsl = false) {
    this.pool = new pg.Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  async init() {
    await this.pool.query(POSTGRES_SCHEMA_SQL);
    await this.seedOrganizations();
  }

  private async seedOrganizations() {
    for (const o of DEFAULT_ORGANIZATIONS) {
      await this.pool.query(
        `INSERT INTO organizations (id, name, category, description, allowed_purposes, badge_color)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, category = EXCLUDED.category, description = EXCLUDED.description,
           allowed_purposes = EXCLUDED.allowed_purposes, badge_color = EXCLUDED.badge_color`,
        [o.id, o.name, o.category, o.description, o.allowedPurposes, o.badgeColor]
      );
    }
  }

  private rowToOrg(r: any): Organization {
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description ?? '',
      allowedPurposes: r.allowed_purposes,
      badgeColor: r.badge_color,
    };
  }

  private rowToToken(r: any): TokenRecord {
    return {
      token: r.token_code,
      identityHmac: r.identity_hmac,
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      purpose: r.purpose,
      proofResult: r.proof_result,
      signature: r.signature ?? undefined,
      createdAt: new Date(r.created_at).getTime(),
      expiresAt: new Date(r.expires_at).getTime(),
      used: !!r.is_used,
      usedAt: r.used_at ? new Date(r.used_at).getTime() : undefined,
    };
  }

  async getOrganizations() {
    const { rows } = await this.pool.query('SELECT * FROM organizations ORDER BY created_at, id');
    return rows.map((r) => this.rowToOrg(r));
  }

  async getOrganization(id: string) {
    const { rows } = await this.pool.query('SELECT * FROM organizations WHERE id = $1', [id]);
    return rows[0] ? this.rowToOrg(rows[0]) : undefined;
  }

  async insertToken(t: TokenRecord) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO identity_hashes (identity_hmac) VALUES ($1)
         ON CONFLICT (identity_hmac) DO UPDATE
           SET last_active_at = CURRENT_TIMESTAMP, tokens_count = identity_hashes.tokens_count + 1`,
        [t.identityHmac]
      );
      await client.query(
        `INSERT INTO verification_tokens
           (token_code, identity_hmac, organization_id, organization_name, purpose, proof_result,
            signature, created_at, expires_at, is_used)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE)`,
        [
          t.token, t.identityHmac, t.organizationId, t.organizationName, t.purpose, t.proofResult,
          t.signature ?? null, new Date(t.createdAt), new Date(t.expiresAt),
        ]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getToken(tokenCode: string) {
    const { rows } = await this.pool.query('SELECT * FROM verification_tokens WHERE token_code = $1', [
      normalizeCode(tokenCode),
    ]);
    return rows[0] ? this.rowToToken(rows[0]) : undefined;
  }

  async markTokenUsed(tokenCode: string, usedAt: number) {
    const res = await this.pool.query(
      'UPDATE verification_tokens SET is_used = TRUE, used_at = $2 WHERE token_code = $1 AND is_used = FALSE',
      [normalizeCode(tokenCode), new Date(usedAt)]
    );
    return res.rowCount === 1;
  }

  async getAllTokens() {
    const { rows } = await this.pool.query('SELECT * FROM verification_tokens ORDER BY created_at DESC LIMIT 500');
    return rows.map((r) => this.rowToToken(r));
  }

  async getIdentityHashes() {
    const { rows } = await this.pool.query('SELECT * FROM identity_hashes ORDER BY id');
    return rows.map((r) => ({
      id: r.id,
      identityHmac: r.identity_hmac,
      firstVerifiedAt: new Date(r.first_verified_at).toISOString(),
      lastActiveAt: new Date(r.last_active_at).toISOString(),
      tokensCount: r.tokens_count,
    }));
  }

  async logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const full: AuditLogEntry = { id: newLogId(), timestamp: new Date().toISOString(), ...entry };
    await this.pool.query(
      `INSERT INTO audit_logs (id, event_type, organization_id, organization_name, purpose, token_code, details, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        full.id, full.eventType, full.organizationId, full.organizationName, full.purpose ?? '',
        full.tokenCode ?? '', full.details, full.status, new Date(full.timestamp),
      ]
    );
    return full;
  }

  async getAuditLogs(limit = 200) {
    const { rows } = await this.pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows.map((r) => ({
      id: r.id,
      timestamp: new Date(r.created_at).toISOString(),
      eventType: r.event_type,
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      purpose: r.purpose,
      tokenCode: r.token_code,
      details: r.details,
      status: r.status,
    }));
  }

  async purgeExpiredTokens(graceMs = 24 * 3600 * 1000) {
    const res = await this.pool.query('DELETE FROM verification_tokens WHERE expires_at < $1', [
      new Date(Date.now() - graceMs),
    ]);
    return res.rowCount ?? 0;
  }

  async reset() {
    await this.pool.query('TRUNCATE verification_tokens, identity_hashes, audit_logs RESTART IDENTITY CASCADE');
    await this.seedOrganizations();
  }
}

/** Chooses PostgreSQL when DATABASE_URL is set, otherwise the in-memory demo store. Call after dotenv.config(). */
export function createStore(env: NodeJS.ProcessEnv = process.env): Store {
  if (env.DATABASE_URL) {
    return new PgStore(env.DATABASE_URL, env.PGSSL === 'true');
  }
  console.warn('[BasItna] DATABASE_URL not set: using IN-MEMORY store (data is lost on restart). Set DATABASE_URL to use PostgreSQL.');
  return new MemoryStore();
}
