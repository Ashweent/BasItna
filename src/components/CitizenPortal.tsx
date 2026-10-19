import React, { useState, useEffect } from 'react';
import { Organization, VerificationPurpose, IssuedTokenResponse, InstitutionType, INSTITUTION_TYPES } from '../types.js';
import {
  ShieldCheck,
  KeyRound,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  Fingerprint,
  UserCheck,
  Lock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface CitizenPortalProps {
  organizations: Organization[];
  onTokenGenerated: (tokenData: IssuedTokenResponse) => void;
  onNavigateToOrgPortal: (tokenCode: string, orgId: string, purpose: string) => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  organizations,
  onTokenGenerated,
  onNavigateToOrgPortal,
}) => {
  const [cnic, setCnic] = useState<string>('42101-1234567-1');
  const [selectedOrgId] = useState<string>('fast-nuces');
  const [selectedPurpose, setSelectedPurpose] = useState<VerificationPurpose>('IDENTITY_VERIFICATION');
  const [email, setEmail] = useState<string>('');
  const [institutionType, setInstitutionType] = useState<InstitutionType>('UNIVERSITY');
  const [ttlHours, setTtlHours] = useState<number>(24);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedToken, setIssuedToken] = useState<IssuedTokenResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Quick preset Pakistani personas for easy testing
  const personas = [
    {
      label: 'Tariq Mehmood',
      cnic: '42101-1234567-1',
      tag: 'Adult (32y) • Valid',
      color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
    },
    {
      label: 'Ayesha Fatima',
      cnic: '61101-8765432-2',
      tag: 'Adult (24y) • Valid',
      color: 'border-teal-500/30 text-teal-400 bg-teal-500/5',
    },
    {
      label: 'Zainab Bilgrami',
      cnic: '35201-9988776-3',
      tag: 'Minor (17y) • Fails 18+',
      color: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
    },
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setIssuedToken(null);

    try {
      const response = await fetch('/api/tokens/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnic,
          email: email.trim(),
          institutionType,
          organizationId: selectedOrgId,
          purpose: selectedPurpose,
          ttlHours,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Verification token creation failed.');
      }

      setIssuedToken(data);
      onTokenGenerated(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate token');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (issuedToken) {
      navigator.clipboard.writeText(issuedToken.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const allowedPurposes: VerificationPurpose[] = selectedOrg?.allowedPurposes ?? ['IDENTITY_VERIFICATION'];

  // Only offer proofs the selected organization is registered to request
  useEffect(() => {
    if (selectedOrg && !selectedOrg.allowedPurposes.includes(selectedPurpose)) {
      setSelectedPurpose(selectedOrg.allowedPurposes[0] ?? 'IDENTITY_VERIFICATION');
    }
  }, [selectedOrgId, selectedOrg]);

  return (
    <div className="space-y-8">
      {/* Intro Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4" />
            Citizen Identity Privacy Layer
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Prove Who You Are. <span className="text-emerald-400">Don&apos;t Hand Over Your Identity.</span>
          </h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Stop pasting your 13-digit CNIC or uploading CNIC scans to Google Forms and portals.
            BasItna confirms your identity against Mock NADRA, hashes it via HMAC-SHA256, and gives you a
            single-use, audience-bound proof token. The organization learns only what it needs,
            <strong className="text-white"> never your CNIC number or document images.</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Verification Form */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 pb-4 border-b border-slate-800">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            Generate Selective Proof Token
          </h3>

          {/* Persona Presets */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quick Test Personas (Mock NADRA Sandbox)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {personas.map((p) => (
                <button
                  key={p.cnic}
                  type="button"
                  onClick={() => setCnic(p.cnic)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    cnic === p.cnic
                      ? 'border-emerald-500 bg-emerald-500/15 text-white ring-1 ring-emerald-500'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300'
                  }`}
                >
                  <div className="font-semibold">{p.label}</div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">{p.cnic}</div>
                  <div className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] border ${p.color}`}>
                    {p.tag}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="mt-6 space-y-5">
            {/* CNIC Input */}
            <div>
              <label htmlFor="cnic-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Pakistani CNIC Number (13 Digits)
              </label>
              <div className="relative">
                <input
                  id="cnic-input"
                  type="text"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  placeholder="e.g. 42101-1234567-1"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                />
                <div className="absolute right-3 top-3 text-xs text-slate-400 font-mono flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <span>Mock NADRA</span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Your CNIC is never stored in plain text. Protected with HMAC-SHA256.</span>
              </p>
            </div>

            {/* Email + Institution type (any school / college / university / personal) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school, college or university"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-slate-600"
                />
              </div>
              <div>
                <label htmlFor="institution-select" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Institution Type
                </label>
                <select
                  id="institution-select"
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value as InstitutionType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-slate-900 text-white">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="-mt-2 text-xs text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shown only to you on your token. Not stored by BasItna and never sent to the organization.</span>
            </p>

            {/* Verification Purpose Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Selective Proof Purpose
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPurpose === 'IDENTITY_VERIFICATION'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="purpose"
                    value="IDENTITY_VERIFICATION"
                    checked={selectedPurpose === 'IDENTITY_VERIFICATION'}
                    onChange={() => setSelectedPurpose('IDENTITY_VERIFICATION')}
                    className="mt-1 accent-emerald-500"
                  />
                  <div>
                    <div className="text-sm font-semibold">Identity Verified</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Proves you are a real, valid citizen without revealing your CNIC number or birthdate.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    !allowedPurposes.includes('AGE_18_PLUS') ? 'opacity-40 cursor-not-allowed ' : ''
                  }${
                    selectedPurpose === 'AGE_18_PLUS'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="purpose"
                    value="AGE_18_PLUS"
                    checked={selectedPurpose === 'AGE_18_PLUS'}
                    disabled={!allowedPurposes.includes('AGE_18_PLUS')}
                    onChange={() => setSelectedPurpose('AGE_18_PLUS')}
                    className="mt-1 accent-emerald-500"
                  />
                  <div>
                    <div className="text-sm font-semibold">18+ Verified</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Proves you are at least 18 years of age without revealing your actual date of birth.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Token Validity Window */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="ttl-select" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Validity Window (Auto-Expiry)
                </label>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {ttlHours} Hours
                </span>
              </div>
              <select
                id="ttl-select"
                value={ttlHours}
                onChange={(e) => setTtlHours(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value={1}>1 Hour (Quick Form Submission)</option>
                <option value={6}>6 Hours (Same-Day Event)</option>
                <option value={24}>24 Hours (Maximum, Standard Event)</option>
              </select>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Verification Blocked</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Checking Mock NADRA & Computing HMAC...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Generate Audience-Bound Token</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Cryptographic Proof Card Result */}
        <div className="lg:col-span-5 space-y-6">
          {issuedToken ? (
            <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> BasItna Proof Token
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  Active & Ready
                </span>
              </div>

              {/* Big Token Display */}
              <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Single-Use Token Code</div>
                <div className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400 tracking-wider">
                  {issuedToken.token}
                </div>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Token</span>
                    </>
                  )}
                </button>
              </div>

              {/* Your details (shown to the citizen only) */}
              {issuedToken.holder && (
                <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-xs space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Your Details</div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-white font-medium truncate max-w-[220px]" title={issuedToken.holder.email}>
                      {issuedToken.holder.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Institution Type:</span>
                    <span className="text-white font-medium">{issuedToken.holder.institutionTypeLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">CNIC:</span>
                    <span className="text-slate-300 font-mono">{issuedToken.holder.cnicMasked}</span>
                  </div>
                </div>
              )}

              {/* Properties */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <span className="text-slate-400">Audience Bound To:</span>
                  <span className="font-semibold text-white truncate max-w-[200px]" title={issuedToken.organizationName}>
                    {issuedToken.organizationName}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <span className="text-slate-400">Selective Proof:</span>
                  <span className="font-semibold text-emerald-400">
                    {issuedToken.proofResult}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <span className="text-slate-400">Identity HMAC Digest:</span>
                  <span className="font-mono text-slate-300">
                    {issuedToken.identityHmacPrefix}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <span className="text-slate-400">Valid Until:</span>
                  <span className="text-slate-300 font-mono">
                    {new Date(issuedToken.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({ttlHours}h)
                  </span>
                </div>
              </div>

              {/* Action: Test in Org Portal */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToOrgPortal(issuedToken.token, issuedToken.organizationId, issuedToken.purpose)}
                  className="w-full py-2.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Redeem Now in Organization Verifier</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-center text-slate-400">
                  Try verifying with the bound org, then test what happens if another org attempts to claim it!
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mx-auto text-slate-400">
                <Fingerprint className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">No Token Issued Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Select a test citizen persona on the left and click Generate to see
                  selective disclosure in action.
                </p>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-left text-xs space-y-2 text-slate-400">
                <div className="text-emerald-400 font-sans font-semibold">Security Highlights:</div>
                <div className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Never stores raw 13-digit CNIC in database</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>No CNIC photos or physical scans needed</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Audience-bound: unusable by other organizations</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Single-use: self-destructs upon redemption</span>
                </div>
              </div>
            </div>
          )}

          {/* Privacy comparison pill */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              What the Organization Receives vs Does NOT Receive:
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <div className="font-bold text-[11px] uppercase tracking-wider text-emerald-400">Organization Sees:</div>
                <div className="mt-1 font-semibold">&ldquo;Identity Verified&rdquo;</div>
                <div className="text-[10px] text-emerald-300/80">or &ldquo;18+ Verified&rdquo;</div>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                <div className="font-bold text-[11px] uppercase tracking-wider text-rose-400">Organization NEVER Sees:</div>
                <div className="mt-1 font-semibold">CNIC Number</div>
                <div className="text-[10px] text-rose-300/80">CNIC Image / Date of Birth</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
