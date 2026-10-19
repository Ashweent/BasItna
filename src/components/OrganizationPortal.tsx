import React, { useState } from 'react';
import { Organization, VerificationPurpose, VerificationResponse, TokenItem } from '../types.js';
import {
  FileCheck2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  History,
  Lock,
  Layers,
  CheckCircle2,
  XCircle,
  Check,
} from 'lucide-react';

interface OrganizationPortalProps {
  organizations: Organization[];
  tokensList: TokenItem[];
  prefilledToken?: string;
  prefilledOrgId?: string;
  prefilledPurpose?: VerificationPurpose;
  onVerificationDone: () => void;
}

export const OrganizationPortal: React.FC<OrganizationPortalProps> = ({
  organizations,
  tokensList,
  prefilledToken = '',
  prefilledOrgId = 'fast-nuces',
  prefilledPurpose = 'IDENTITY_VERIFICATION',
  onVerificationDone,
}) => {
  const [tokenCode, setTokenCode] = useState<string>(prefilledToken);
  const [checkingOrgId, setCheckingOrgId] = useState<string>(prefilledOrgId);
  const [checkingPurpose, setCheckingPurpose] = useState<VerificationPurpose>(prefilledPurpose);
  const [manualKey, setManualKey] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<VerificationResponse | null>(null);

  const selectedOrg = organizations.find((o) => o.id === checkingOrgId);
  // Demo mode auto-fills the organization's API key; in production the organization enters its own.
  const orgApiKey = manualKey || selectedOrg?.demoApiKey || '';

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tokenCode.trim()) return;

    setIsVerifying(true);
    setResult(null);

    try {
      const response = await fetch('/api/tokens/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-key': orgApiKey },
        body: JSON.stringify({
          token: tokenCode.trim(),
          organizationId: checkingOrgId,
          purpose: checkingPurpose,
        }),
      });

      const data: VerificationResponse = await response.json();
      setResult(data);
      onVerificationDone();
    } catch (err: any) {
      setResult({
        success: false,
        valid: false,
        status: 'TOKEN_NOT_FOUND',
        message: err.message || 'Verification network request failed.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Quick Attack / Security Simulation Handlers
  const testAudienceMismatch = () => {
    // Pick another org different from current
    const differentOrg = organizations.find((o) => o.id !== checkingOrgId) || organizations[0];
    setCheckingOrgId(differentOrg.id);
    setTimeout(() => {
      handleVerify();
    }, 100);
  };

  const testPurposeMismatch = () => {
    const flippedPurpose = checkingPurpose === 'IDENTITY_VERIFICATION' ? 'AGE_18_PLUS' : 'IDENTITY_VERIFICATION';
    setCheckingPurpose(flippedPurpose);
    setTimeout(() => {
      handleVerify();
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/20 rounded-2xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
            <FileCheck2 className="w-4 h-4" />
            Organization Verifier Terminal
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Verify Facts, <span className="text-blue-400">Zero Liability Storage.</span>
          </h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Organizations like universities, banks, and gated communities only need to know:
            <em className="text-emerald-300 font-medium"> is this person valid?</em> or <em className="text-emerald-300 font-medium">are they 18+?</em>
            Instead of storing thousands of sensitive CNIC scans in unprotected folders, redeem a BasItna token to receive
            instant cryptographic proof.
          </p>
        </div>
      </div>

      {/* Quick Select from Active Issued Tokens */}
      {tokensList.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-400" />
              Recently Generated Sandbox Tokens (Click to Auto-Fill):
            </span>
            <span className="text-xs text-slate-500">Live Memory</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tokensList.slice(0, 5).map((t) => (
              <button
                key={t.token}
                type="button"
                onClick={() => {
                  setTokenCode(t.token);
                  setCheckingOrgId(t.organizationId);
                  setCheckingPurpose(t.purpose);
                  setResult(null);
                }}
                className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
                  tokenCode === t.token
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <span>{t.token}</span>
                <span className="text-[10px] text-slate-400">({t.organizationName.split(' ')[0]})</span>
                {t.used ? (
                  <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20">
                    Used
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Verifier Input Box */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 pb-4 border-b border-slate-800">
            <Building2 className="w-5 h-5 text-blue-400" />
            Organization Verification Form
          </h3>

          <form onSubmit={handleVerify} className="mt-5 space-y-5">
            {/* Checking Organization Selector */}
            <div>
              <label htmlFor="verifier-org" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Redeeming Organization
              </label>
              <div className="relative">
                <select
                  id="verifier-org"
                  value={checkingOrgId}
                  onChange={(e) => setCheckingOrgId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id} className="bg-slate-900 text-white">
                      {org.name} ({org.category})
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Audience binding prevents an Aga Khan Hospital token from being accepted at FAST NUCES or HBL.
              </p>
            </div>

            {/* Token Code Input */}
            <div>
              <label htmlFor="token-code-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                BasItna Verification Token (BI-XXXX-XXXX)
              </label>
              <input
                id="token-code-input"
                type="text"
                value={tokenCode}
                onChange={(e) => setTokenCode(e.target.value.toUpperCase())}
                placeholder="e.g. BI-8F29-X72P"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 font-mono text-base uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
              />
              <p className="mt-1 text-xs text-slate-400">
                Supplied by the student or applicant on your registration form.
              </p>
            </div>

            {/* Purpose Verification Request */}
            <div>
              <label htmlFor="org-api-key" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Organization API Key
              </label>
              <input
                id="org-api-key"
                type="password"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder={selectedOrg?.demoApiKey ? 'Auto-filled in demo mode' : 'bik_...'}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Only the registered organization can redeem its tokens.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Verification Proof Needed
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    checkingPurpose === 'IDENTITY_VERIFICATION'
                      ? 'border-blue-500 bg-blue-500/10 text-white ring-1 ring-blue-500'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="org-purpose"
                    value="IDENTITY_VERIFICATION"
                    checked={checkingPurpose === 'IDENTITY_VERIFICATION'}
                    onChange={() => setCheckingPurpose('IDENTITY_VERIFICATION')}
                    className="mt-1 accent-blue-500"
                  />
                  <div>
                    <div className="text-sm font-semibold">Verify Identity</div>
                    <div className="text-xs text-slate-400">Validate real citizen standing</div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    checkingPurpose === 'AGE_18_PLUS'
                      ? 'border-blue-500 bg-blue-500/10 text-white ring-1 ring-blue-500'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="org-purpose"
                    value="AGE_18_PLUS"
                    checked={checkingPurpose === 'AGE_18_PLUS'}
                    onChange={() => setCheckingPurpose('AGE_18_PLUS')}
                    className="mt-1 accent-blue-500"
                  />
                  <div>
                    <div className="text-sm font-semibold">Verify Age 18+</div>
                    <div className="text-xs text-slate-400">Validate legal age threshold</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Verification Button */}
            <button
              type="submit"
              disabled={isVerifying || !tokenCode.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Checking Cryptographic Constraints...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="w-5 h-5" />
                  <span>Verify Token with BasItna</span>
                </>
              )}
            </button>
          </form>

          {/* Hackathon MVP Test Cases Suite */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              Attack Simulation & Constraint Testing (MVP Checklist)
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Test how BasItna mathematically blocks identity token hijacking and reuse:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={testAudienceMismatch}
                className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-xs font-semibold text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>1. Test Audience Mismatch (Wrong Org)</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>

              <button
                type="button"
                onClick={() => handleVerify()}
                className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 text-xs font-semibold text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>2. Test Replay Attack (Re-verify Same Token)</span>
                <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
              </button>

              <button
                type="button"
                onClick={testPurposeMismatch}
                className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300 text-xs font-semibold text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>3. Test Purpose Mismatch</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTokenCode('BI-DEAD-BEEF');
                  setTimeout(() => handleVerify(), 100);
                }}
                className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 text-slate-300 text-xs font-semibold text-left transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>4. Test Non-Existent Fake Token</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Verification Result Display */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <div
              className={`rounded-2xl p-6 border-2 shadow-2xl transition-all ${
                result.valid
                  ? 'bg-emerald-950/30 border-emerald-500/70'
                  : 'bg-rose-950/30 border-rose-500/70'
              }`}
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {result.valid ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <XCircle className="w-5 h-5" />
                    </div>
                  )}
                  <span className="font-bold text-sm tracking-wide text-white">
                    {result.valid ? 'Verification Successful' : 'Verification Denied'}
                  </span>
                </div>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold ${
                    result.valid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {result.status}
                </span>
              </div>

              {/* Main Result Card */}
              {result.valid ? (
                <div className="mt-5 space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <div className="text-xs text-emerald-300 uppercase tracking-wider">Proof Returned:</div>
                    <div className="text-2xl font-black text-emerald-400 tracking-tight mt-1 flex items-center justify-center gap-1.5">
                      <span>&ldquo;{result.proofResult}&rdquo;</span>
                      <Check className="w-6 h-6 text-emerald-400 inline" />
                    </div>
                    <div className="text-xs text-emerald-200/80 mt-1 font-mono">
                      Timestamp: {new Date(result.verifiedAt || Date.now()).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="font-semibold text-slate-300">Privacy Guarantees Upheld:</div>
                    <div className="text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Zero CNIC number collected or exposed to {selectedOrg?.name}.</span>
                    </div>
                    <div className="text-slate-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>No CNIC physical card photo requested or stored.</span>
                    </div>
                    <div className="text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Token has now been burned (single-use consumed).</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <div className="text-xs text-rose-400 uppercase tracking-wider font-semibold">
                      Reason for Rejection:
                    </div>
                    <div className="text-sm font-semibold text-rose-200 mt-1">
                      {result.message}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                    <div className="font-semibold text-rose-400">Security Rule Enforced:</div>
                    {result.status === 'AUDIENCE_MISMATCH' && (
                      <p className="text-slate-400">
                        Audience-binding prevents token harvesting: a token issued for Organization A is cryptographically bound and will never validate for Organization B.
                      </p>
                    )}
                    {result.status === 'ALREADY_USED' && (
                      <p className="text-slate-400">
                        Single-use policy prevents replay attacks: once a verification fact has been redeemed, the token is permanently invalidated.
                      </p>
                    )}
                    {result.status === 'PURPOSE_MISMATCH' && (
                      <p className="text-slate-400">
                        Selective disclosure boundary: Proof generated for general identity cannot be repurposed for age verification without citizen consent.
                      </p>
                    )}
                    {result.status === 'EXPIRED' && (
                      <p className="text-slate-400">
                        Temporary lifecycle: Tokens expire automatically to eliminate stale credentials.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto text-blue-400">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-white">Awaiting Token Redemption</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Enter an issued token code from the citizen portal above, or click one of the recent tokens to inspect the verification response.
              </p>
            </div>
          )}

          {/* Org compliance notice */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              Organizational Benefits of BasItna
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>Eliminates massive data breach liabilities and GDPR/PECA compliance risks</li>
              <li>Saves server costs of hosting high-resolution CNIC image uploads</li>
              <li>Guarantees real citizen verification via Mock NADRA gateway</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
