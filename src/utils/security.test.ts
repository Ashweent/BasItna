import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTokenCode,
  createVerificationToken,
  verifyAudienceToken,
  clampTtlSeconds,
  deriveOrgApiKey,
  isValidPurpose,
  countCnicLikeValues,
  generateIdentityHmac,
  MAX_TTL_SECONDS,
} from './crypto.js';
import { verifyWithNadra } from './nadra.js';
import { loadConfig } from './config.js';
import { detectSensitiveCategory } from './formAnalyzer.js';
import { MemoryStore, countStoredCnics } from '../db/database.js';

test('token code looks like BI-XXXX-XXXX (alphanumeric, unambiguous) and is unique', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const code = generateTokenCode();
    assert.match(code, /^BI-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    seen.add(code);
  }
  assert.equal(seen.size, 500);
});

test('TTL is clamped to 1 minute .. 24 hours', () => {
  assert.equal(clampTtlSeconds(99999), MAX_TTL_SECONDS);
  assert.equal(clampTtlSeconds(72), MAX_TTL_SECONDS);
  assert.equal(clampTtlSeconds(1), 3600);
  assert.equal(clampTtlSeconds(undefined), MAX_TTL_SECONDS);
  assert.equal(clampTtlSeconds(-5), MAX_TTL_SECONDS);
  assert.equal(clampTtlSeconds(0.0001), 60);
});

test('signed token: tampering with org/purpose/expiry is detected', () => {
  const key = 'k'.repeat(64);
  const make = () =>
    createVerificationToken({
      identityHmac: 'h', organizationId: 'fast-nuces', organizationName: 'FAST',
      purpose: 'IDENTITY_VERIFICATION', proofResult: 'Identity Verified', signingKey: key,
    });

  assert.equal(verifyAudienceToken(make(), 'fast-nuces', 'IDENTITY_VERIFICATION', undefined, key).valid, true);

  const t1 = make();
  t1.expiresAt += 7 * 24 * 3600 * 1000; // someone extends validity directly in the DB
  assert.equal(verifyAudienceToken(t1, 'fast-nuces', 'IDENTITY_VERIFICATION', undefined, key).status, 'INVALID_SIGNATURE');

  const t2 = make();
  t2.proofResult = '18+ Verified';
  assert.equal(verifyAudienceToken(t2, 'fast-nuces', 'IDENTITY_VERIFICATION', undefined, key).status, 'INVALID_SIGNATURE');

  const t3 = make();
  assert.equal(verifyAudienceToken(t3, 'fast-nuces', 'IDENTITY_VERIFICATION', undefined, 'wrong-key').status, 'INVALID_SIGNATURE');
});

test('mock NADRA only knows its dummy registry: unknown CNIC is rejected, no data invented', () => {
  assert.equal(verifyWithNadra('42101-1234567-1').success, true);
  assert.equal(verifyWithNadra('4210112345671').success, true);
  const unknown = verifyWithNadra('99999-9999999-9');
  assert.equal(unknown.success, false);
  assert.equal(unknown.citizen, undefined);
  assert.equal(verifyWithNadra('12345').success, false);
  assert.equal(verifyWithNadra('42201-3344556-7').success, false); // deceased/suspended record
});

test('mock NADRA reports 18+ correctly and exposes no name/city/DOB', () => {
  const adult = verifyWithNadra('42101-1234567-1');
  assert.equal(adult.citizen?.is18Plus, true);
  assert.deepEqual(Object.keys(adult.citizen!).sort(), ['is18Plus', 'isAlive']);
  const minor = verifyWithNadra('35201-9988776-3');
  assert.equal(minor.success, true);
  assert.equal(minor.citizen?.is18Plus, false);
});

test('purposes: STUDENT_STATUS (not in the proposal) is no longer valid', () => {
  assert.equal(isValidPurpose('IDENTITY_VERIFICATION'), true);
  assert.equal(isValidPurpose('AGE_18_PLUS'), true);
  assert.equal(isValidPurpose('STUDENT_STATUS'), false);
  assert.equal(isValidPurpose(undefined), false);
});

test('org API keys are per-organization and deterministic', () => {
  const s = 's'.repeat(64);
  assert.equal(deriveOrgApiKey('a', s), deriveOrgApiKey('a', s));
  assert.notEqual(deriveOrgApiKey('a', s), deriveOrgApiKey('b', s));
  assert.notEqual(deriveOrgApiKey('a', s), deriveOrgApiKey('a', 't'.repeat(64)));
});

test('config: production refuses to start without a strong HMAC secret; no hardcoded fallback', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' } as any), /BASITNA_HMAC_SECRET/);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', BASITNA_HMAC_SECRET: 'short' } as any), /BASITNA_HMAC_SECRET/);
  const ok = loadConfig({ NODE_ENV: 'production', BASITNA_HMAC_SECRET: 'x'.repeat(40) } as any);
  assert.equal(ok.secretSource, 'environment');
  assert.equal(ok.demoMode, false);
  const dev1 = loadConfig({} as any);
  const dev2 = loadConfig({} as any);
  assert.notEqual(dev1.identityKey, dev2.identityKey); // random ephemeral secret, not a constant
});

test('countCnicLikeValues detects raw CNICs but ignores HMAC hex digests', () => {
  assert.equal(countCnicLikeValues({ a: '42101-1234567-1', b: 'x 4210112345671 y' }), 2);
  const hmac = generateIdentityHmac('42101-1234567-1', 'k');
  assert.equal(countCnicLikeValues({ hmac, other: '1234567890123abcdef' }), 0);
});

test('store: single-use is atomic and nothing CNIC-like is persisted', async () => {
  const store = new MemoryStore();
  await store.init();
  const t = createVerificationToken({
    identityHmac: generateIdentityHmac('42101-1234567-1', 'k'),
    organizationId: 'fast-nuces', organizationName: 'FAST',
    purpose: 'IDENTITY_VERIFICATION', proofResult: 'Identity Verified',
  });
  await store.insertToken(t);
  assert.equal(await store.markTokenUsed(t.token, Date.now()), true);
  assert.equal(await store.markTokenUsed(t.token, Date.now()), false);
  assert.equal((await store.getToken(t.token))?.used, true);
  assert.equal(await countStoredCnics(store), 0);
});

test('store: purgeExpiredTokens removes long-expired tokens only', async () => {
  const store = new MemoryStore();
  await store.init();
  const old = createVerificationToken({
    identityHmac: 'h1', organizationId: 'fast-nuces', organizationName: 'F',
    purpose: 'IDENTITY_VERIFICATION', proofResult: 'Identity Verified',
    ttlSeconds: 60, currentTime: Date.now() - 3 * 24 * 3600 * 1000,
  });
  const fresh = createVerificationToken({
    identityHmac: 'h2', organizationId: 'fast-nuces', organizationName: 'F',
    purpose: 'IDENTITY_VERIFICATION', proofResult: 'Identity Verified',
  });
  await store.insertToken(old);
  await store.insertToken(fresh);
  assert.equal(await store.purgeExpiredTokens(), 1);
  assert.equal((await store.getAllTokens()).length, 1);
});

test('automatic sensitive-data detection categorises fields', () => {
  assert.equal(detectSensitiveCategory({ label: '13-Digit CNIC Number', type: 'text' }), 'CRITICAL_CNIC');
  assert.equal(detectSensitiveCategory({ label: 'CNIC Front & Back Scan', type: 'file' }), 'CRITICAL_PHOTO');
  assert.equal(detectSensitiveCategory({ label: "Father's CNIC", type: 'text' }), 'FAMILY_PII');
  assert.equal(detectSensitiveCategory({ label: 'Permanent Home Address', type: 'text' }), 'LOCATION_PII');
  assert.equal(detectSensitiveCategory({ label: 'Full Name', type: 'text' }), 'STANDARD');
});

test('audit log ids never look like a CNIC (no 13-digit timestamp runs)', async () => {
  const store = new MemoryStore();
  await store.init();
  const e = await store.logAudit({
    eventType: 'TOKEN_ISSUED', organizationId: 'x', organizationName: 'X', purpose: 'IDENTITY_VERIFICATION',
    tokenCode: 'BI-AAAA-BBBB', details: 'ok', status: 'SUCCESS',
  });
  assert.equal(countCnicLikeValues(e), 0);
  assert.equal(await countStoredCnics(store), 0);
});

test('email validation accepts any school/college/university/personal email', async () => {
  const { isValidEmail, isInstitutionType, maskCnic } = await import('./validation.js');
  for (const e of ['a@nu.edu.pk', 'student@college.edu.pk', 'kid@school.org', 'me@gmail.com']) {
    assert.equal(isValidEmail(e), true, e);
  }
  for (const e of ['', 'nope', 'a@b', 'a b@c.com', 123, undefined]) assert.equal(isValidEmail(e), false);
  for (const t of ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'UNDERGRADUATE', 'POSTGRADUATE']) {
    assert.equal(isInstitutionType(t), true);
  }
  assert.equal(isInstitutionType('MADRASA_X'), false);
  assert.equal(isInstitutionType('OTHER'), false);
  assert.equal(maskCnic('4210112345671'), '42101-*******-1');
});
