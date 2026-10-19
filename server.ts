import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateIdentityHmac,
  createVerificationToken,
  verifyAudienceToken,
  isValidCnic,
  isValidPurpose,
  clampTtlSeconds,
  deriveOrgApiKey,
  safeEqual,
} from './src/utils/crypto.js';
import { loadConfig } from './src/utils/config.js';
import { rateLimit } from './src/utils/rateLimit.js';
import { verifyWithNadra } from './src/utils/nadra.js';
import { isValidEmail, isInstitutionType, institutionLabel, maskCnic } from './src/utils/validation.js';
import { createStore, buildDatabaseDump, countStoredCnics } from './src/db/database.js';
import {
  analyzeFormWithGemini,
  detectSensitiveCategory,
  PRESET_FORMS,
  FormTemplate,
} from './src/utils/formAnalyzer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = loadConfig(); // secrets come ONLY from the environment (no hardcoded fallback)
const db = createStore();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
if (config.isProduction) app.set('trust proxy', 1);

// --- HTTPS enforcement + security headers (production) ---------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (!req.secure) {
      return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
    }
  }
  next();
});

app.use(express.json({ limit: '100kb' }));

// --- Admin guard for inspection endpoints ----------------------------------------------
// ADMIN_API_KEY set  -> header x-admin-key must match.
// not set + demo mode (non-production) -> open for the sandbox UI.
// not set + production -> endpoints are disabled.
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (config.adminApiKey) {
    const provided = String(req.headers['x-admin-key'] || '');
    if (provided && safeEqual(provided, config.adminApiKey)) return next();
    return res.status(401).json({ success: false, message: 'Admin key required.' });
  }
  if (config.demoMode) return next();
  return res.status(403).json({ success: false, message: 'This endpoint is disabled (set ADMIN_API_KEY).' });
}

const issueLimiter = rateLimit({ windowMs: 60_000, max: 20 });
const verifyLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  key: (req) => `${req.ip}:${String(req.body?.organizationId || '')}`,
});

// --- Public routes ---------------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'BasItna - Proof, Not Data',
    timestamp: new Date().toISOString(),
    storage: db.kind,
    rawCnicStored: await countStoredCnics(db), // measured, not hardcoded
    security: {
      hmacAlgorithm: 'HMAC-SHA256',
      secretStorage: `Environment variable (${config.secretSource}), never in database or client`,
      tokenBinding: 'Organization + purpose + expiry, HMAC-signed, single-use',
      nadraMode: 'Mock NADRA MVP Service',
      https: config.isProduction ? 'enforced' : 'dev (HTTP) - enforced in production',
    },
  });
});

app.get('/api/organizations', async (_req, res) => {
  const orgs = await db.getOrganizations();
  res.json({
    success: true,
    organizations: orgs.map((o) =>
      // Demo mode only: sandbox UI plays the role of the organization, so it receives that org's key.
      config.demoMode ? { ...o, demoApiKey: deriveOrgApiKey(o.id, config.orgKeySecret) } : o
    ),
  });
});

// Issue token (User -> BasItna -> Token)
app.post('/api/tokens/issue', issueLimiter, async (req, res) => {
  try {
    const { cnic, organizationId, purpose, ttlHours, email, institutionType } = req.body ?? {};

    if (!cnic || typeof cnic !== 'string' || !isValidCnic(cnic)) {
      return res.status(400).json({
        success: false,
        message: 'A valid 13-digit Pakistani CNIC number (XXXXX-XXXXXXX-X) is required.',
      });
    }

    if (!isValidPurpose(purpose)) {
      return res.status(400).json({ success: false, message: 'A valid verification purpose is required.' });
    }

    // Email can be from any school, college or university (or personal): no domain restriction.
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    const holderType = institutionType === undefined ? 'UNIVERSITY' : institutionType;
    if (!isInstitutionType(holderType)) {
      return res.status(400).json({ success: false, message: 'Invalid institution type.' });
    }

    const org = await db.getOrganization(String(organizationId));
    if (!org) {
      return res.status(404).json({
        success: false,
        message: `Organization "${organizationId}" is not registered in the BasItna gateway.`,
      });
    }

    // Purpose must be one the organization is registered to request
    if (!org.allowedPurposes.includes(purpose)) {
      return res.status(403).json({
        success: false,
        message: `"${org.name}" is not registered to request the "${purpose}" proof.`,
      });
    }

    const nadraCheck = verifyWithNadra(cnic);
    if (!nadraCheck.success) {
      return res.status(400).json({ success: false, message: nadraCheck.message });
    }

    let proofResult = 'Identity Verified';
    if (purpose === 'AGE_18_PLUS') {
      if (!nadraCheck.citizen?.is18Plus) {
        return res.status(403).json({
          success: false,
          message: 'Selective proof rejected: Applicant is under 18 according to verified registry.',
        });
      }
      proofResult = '18+ Verified';
    }

    const identityHmac = generateIdentityHmac(cnic, config.identityKey);

    const tokenRecord = createVerificationToken({
      identityHmac,
      organizationId: org.id,
      organizationName: org.name,
      purpose,
      proofResult,
      ttlSeconds: clampTtlSeconds(ttlHours), // server-enforced: 1 min .. 24 h
      signingKey: config.tokenSigningKey,
    });

    await db.insertToken(tokenRecord);

    // Audit log (NO plain text CNIC or DOB is ever written)
    await db.logAudit({
      eventType: 'TOKEN_ISSUED',
      organizationId: org.id,
      organizationName: org.name,
      purpose,
      tokenCode: tokenRecord.token,
      details: `Generated audience-bound token for "${org.name}" with proof "${proofResult}". Identity protected with HMAC-SHA256.`,
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      token: tokenRecord.token,
      organizationId: org.id,
      organizationName: org.name,
      purpose: tokenRecord.purpose,
      proofResult: tokenRecord.proofResult,
      expiresAt: tokenRecord.expiresAt,
      identityHmacPrefix: `${identityHmac.slice(0, 8)}...${identityHmac.slice(-8)}`,
      // Echoed back to the citizen only. NOT stored, NOT logged, NOT shared with the organization.
      holder: {
        email: email.trim(),
        institutionType: holderType,
        institutionTypeLabel: institutionLabel(holderType),
        cnicMasked: maskCnic(cnic),
      },
      message: 'Temporary audience-bound proof token generated successfully.',
    });
  } catch (error: any) {
    console.error('Issue token error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Organization token verification (Organization -> BasItna -> Proof)
app.post('/api/tokens/verify', verifyLimiter, async (req, res) => {
  try {
    const { token, organizationId, purpose } = req.body ?? {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Token code is required (e.g. BI-XXXX-XXXX).' });
    }
    if (!isValidPurpose(purpose)) {
      return res.status(400).json({
        success: false,
        message: 'The organization must state the purpose (IDENTITY_VERIFICATION or AGE_18_PLUS).',
      });
    }

    // Authenticate the organization
    const checkingOrg = await db.getOrganization(String(organizationId));
    const providedKey = String(req.headers['x-org-key'] || '');
    const expectedKey = checkingOrg ? deriveOrgApiKey(checkingOrg.id, config.orgKeySecret) : '';
    if (!checkingOrg || !providedKey || !safeEqual(providedKey, expectedKey)) {
      await db.logAudit({
        eventType: 'VERIFICATION_REJECTED',
        organizationId: String(organizationId ?? 'unknown').slice(0, 64),
        organizationName: checkingOrg?.name ?? 'unknown',
        purpose,
        tokenCode: '',
        details: 'Rejected: missing or invalid organization API key.',
        status: 'BLOCKED',
      });
      return res.status(401).json({
        success: false,
        valid: false,
        status: 'UNAUTHORIZED',
        message: 'Organization authentication failed (invalid or missing organization API key).',
      });
    }

    const tokenRecord = await db.getToken(token);
    const verification = verifyAudienceToken(
      tokenRecord,
      checkingOrg.id,
      purpose,
      undefined,
      config.tokenSigningKey
    );

    if (verification.valid && tokenRecord) {
      // Atomic single-use: only one concurrent redeemer can win
      const consumed = await db.markTokenUsed(tokenRecord.token, tokenRecord.usedAt ?? Date.now());
      if (!consumed) {
        await db.logAudit({
          eventType: 'VERIFICATION_REJECTED',
          organizationId: checkingOrg.id,
          organizationName: checkingOrg.name,
          purpose,
          tokenCode: token,
          details: 'Rejected: token was consumed by a concurrent request.',
          status: 'BLOCKED',
        });
        return res.status(400).json({
          success: false,
          valid: false,
          status: 'ALREADY_USED',
          message: 'Token has already been consumed. Re-submission is prohibited.',
        });
      }
      await db.logAudit({
        eventType: 'TOKEN_VERIFIED',
        organizationId: checkingOrg.id,
        organizationName: checkingOrg.name,
        purpose,
        tokenCode: token,
        details: `Token redeemed by ${checkingOrg.name}. Proof received: "${verification.proofResult}". Single-use consumed.`,
        status: 'SUCCESS',
      });
      return res.json({ success: true, ...verification });
    }

    await db.logAudit({
      eventType: verification.status === 'EXPIRED' ? 'TOKEN_EXPIRED' : 'VERIFICATION_REJECTED',
      organizationId: checkingOrg.id,
      organizationName: checkingOrg.name,
      purpose,
      tokenCode: token,
      details: `Rejected verification attempt: ${verification.status} - ${verification.message}`,
      status: 'BLOCKED',
    });
    return res.status(400).json({ success: false, ...verification });
  } catch (error: any) {
    console.error('Verify token error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// --- Admin / sandbox inspection endpoints (guarded) --------------------------------------
app.get('/api/tokens/list', requireAdmin, async (_req, res) => {
  const tokens = await db.getAllTokens();
  res.json({
    success: true,
    tokens: tokens.map((t) => ({
      token: t.token,
      organizationId: t.organizationId,
      organizationName: t.organizationName,
      purpose: t.purpose,
      proofResult: t.proofResult,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      used: t.used,
      usedAt: t.usedAt,
      identityHmacPreview: `${t.identityHmac.slice(0, 6)}...${t.identityHmac.slice(-6)}`,
    })),
  });
});

app.get('/api/audit-logs', requireAdmin, async (_req, res) => {
  res.json({ success: true, logs: await db.getAuditLogs() });
});

app.get('/api/database/dump', requireAdmin, async (_req, res) => {
  res.json({ success: true, dump: await buildDatabaseDump(db) });
});

app.post('/api/reset', requireAdmin, async (_req, res) => {
  await db.reset();
  res.json({ success: true, message: 'BasItna sandbox data reset to clean initial state.' });
});

// --- AI Form Privacy Analyzer ------------------------------------------------------------
app.get('/api/preset-forms', (_req, res) => {
  res.json({ success: true, forms: PRESET_FORMS });
});

app.post('/api/analyze-form', rateLimit({ windowMs: 60_000, max: 15 }), async (req, res) => {
  try {
    const { form } = (req.body ?? {}) as { form: FormTemplate };
    if (!form || !Array.isArray(form.fields) || form.fields.length === 0 || form.fields.length > 60) {
      return res.status(400).json({ success: false, message: 'Invalid form structure provided.' });
    }
    // Automatic sensitive-data detection: categories are derived from labels/types, not trusted from the client
    const detected: FormTemplate = {
      ...form,
      fields: form.fields.map((f) => ({ ...f, sensitiveCategory: detectSensitiveCategory(f) })),
    };
    const analysis = await analyzeFormWithGemini(detected);
    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Analyze form error:', error);
    res.status(500).json({ success: false, message: 'Analysis failed' });
  }
});

// --- Serving -------------------------------------------------------------------------------
async function startServer() {
  await db.init(); // creates PostgreSQL tables / seeds organizations

  // Retention: delete tokens that expired more than 24h ago
  setInterval(() => {
    db.purgeExpiredTokens().catch((e) => console.error('Purge failed:', e));
  }, 60 * 60 * 1000).unref();

  if (!config.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BasItna Server] Running on http://0.0.0.0:${PORT} (storage: ${db.kind})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
