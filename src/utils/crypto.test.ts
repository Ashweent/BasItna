import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCnic,
  isValidCnic,
  generateIdentityHmac,
  createVerificationToken,
  verifyAudienceToken,
  calculateIs18Plus
} from './crypto.ts';
import { analyzeFormLocally } from './formAnalyzer.ts';

test('normalizeCnic formats 13-digit numbers to standard hyphenated pattern', () => {
  assert.equal(normalizeCnic('4210112345671'), '42101-1234567-1');
  assert.equal(normalizeCnic('42101-1234567-1'), '42101-1234567-1');
  assert.equal(normalizeCnic('  42101-1234567-1 '), '42101-1234567-1');
});

test('isValidCnic checks 13 digit validity', () => {
  assert.equal(isValidCnic('42101-1234567-1'), true);
  assert.equal(isValidCnic('4210112345671'), true);
  assert.equal(isValidCnic('42101-12345'), false);
  assert.equal(isValidCnic('abcdef1234567'), false);
});

test('generateIdentityHmac produces deterministic 64-char hex and differs with different keys', () => {
  const cnic = '42101-1234567-1';
  const key1 = 'secret-key-alpha';
  const key2 = 'secret-key-beta';

  const hmac1 = generateIdentityHmac(cnic, key1);
  const hmac1Repeat = generateIdentityHmac('4210112345671', key1);
  const hmac2 = generateIdentityHmac(cnic, key2);

  assert.equal(hmac1.length, 64);
  assert.equal(hmac1, hmac1Repeat, 'Normalized inputs with same key must yield identical HMAC');
  assert.notEqual(hmac1, hmac2, 'Different secret keys must produce distinct HMAC digests');
});

test('verifyAudienceToken successfully verifies token for authorized audience and purpose', () => {
  const token = createVerificationToken({
    identityHmac: 'abc123hmac',
    organizationId: 'fast-nuces',
    organizationName: 'FAST NUCES AI Workshop',
    purpose: 'IDENTITY_VERIFICATION',
    proofResult: 'Identity Verified',
    ttlSeconds: 3600,
  });

  const result = verifyAudienceToken(token, 'fast-nuces', 'IDENTITY_VERIFICATION');
  assert.equal(result.valid, true);
  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.proofResult, 'Identity Verified');
});

test('verifyAudienceToken rejects audience mismatch', () => {
  const token = createVerificationToken({
    identityHmac: 'abc123hmac',
    organizationId: 'fast-nuces',
    organizationName: 'FAST NUCES AI Workshop',
    purpose: 'IDENTITY_VERIFICATION',
    proofResult: 'Identity Verified',
  });

  const result = verifyAudienceToken(token, 'aga-khan-hospital', 'IDENTITY_VERIFICATION');
  assert.equal(result.valid, false);
  assert.equal(result.status, 'AUDIENCE_MISMATCH');
  assert.match(result.message, /Audience mismatch/);
});

test('verifyAudienceToken rejects purpose mismatch', () => {
  const token = createVerificationToken({
    identityHmac: 'abc123hmac',
    organizationId: 'fast-nuces',
    organizationName: 'FAST NUCES AI Workshop',
    purpose: 'IDENTITY_VERIFICATION',
    proofResult: 'Identity Verified',
  });

  const result = verifyAudienceToken(token, 'fast-nuces', 'AGE_18_PLUS');
  assert.equal(result.valid, false);
  assert.equal(result.status, 'PURPOSE_MISMATCH');
});

test('verifyAudienceToken rejects replay attack / already used token (single-use)', () => {
  const token = createVerificationToken({
    identityHmac: 'abc123hmac',
    organizationId: 'fast-nuces',
    organizationName: 'FAST NUCES AI Workshop',
    purpose: 'IDENTITY_VERIFICATION',
    proofResult: 'Identity Verified',
  });

  const firstAttempt = verifyAudienceToken(token, 'fast-nuces', 'IDENTITY_VERIFICATION');
  assert.equal(firstAttempt.valid, true);

  const secondAttempt = verifyAudienceToken(token, 'fast-nuces', 'IDENTITY_VERIFICATION');
  assert.equal(secondAttempt.valid, false);
  assert.equal(secondAttempt.status, 'ALREADY_USED');
});

test('verifyAudienceToken rejects expired tokens', () => {
  const baseTime = 1000000;
  const token = createVerificationToken({
    identityHmac: 'abc123hmac',
    organizationId: 'fast-nuces',
    organizationName: 'FAST NUCES AI Workshop',
    purpose: 'IDENTITY_VERIFICATION',
    proofResult: 'Identity Verified',
    ttlSeconds: 60,
    currentTime: baseTime,
  });

  const expiredAttempt = verifyAudienceToken(
    token,
    'fast-nuces',
    'IDENTITY_VERIFICATION',
    baseTime + 70000 // 70 seconds later
  );
  assert.equal(expiredAttempt.valid, false);
  assert.equal(expiredAttempt.status, 'EXPIRED');
});

test('calculateIs18Plus correctly determines majority', () => {
  const fixedNow = new Date('2026-10-16');
  assert.equal(calculateIs18Plus('2000-01-01', fixedNow), true);
  assert.equal(calculateIs18Plus('2008-10-15', fixedNow), true);
  assert.equal(calculateIs18Plus('2010-05-20', fixedNow), false);
});

test('analyzeFormLocally severely penalizes forms requesting raw CNIC and CNIC photo scans', () => {
  const badForm = {
    id: 'test-form',
    title: 'Invasive Form',
    organization: 'Acme',
    context: 'Test',
    hasPurposeStatement: false,
    hasRetentionStatement: false,
    fields: [
      { id: '1', label: '13-digit CNIC', type: 'text' as const, required: true },
      { id: '2', label: 'CNIC Front Copy Scan', type: 'file' as const, required: true },
      { id: '3', label: "Father's CNIC", type: 'text' as const, required: true },
      { id: '4', label: 'Permanent Address', type: 'text' as const, required: true },
    ],
  };

  const result = analyzeFormLocally(badForm);
  assert.ok(result.score <= 30, `Score should be heavily penalized for invasive CNIC collection, got ${result.score}`);
  assert.equal(result.riskLevel, 'CRITICAL');
  assert.ok(result.violations.length >= 4);
  assert.ok(result.minimizedFormSuggestion.fieldsToReplaceWithBasItna.length >= 2);
});

