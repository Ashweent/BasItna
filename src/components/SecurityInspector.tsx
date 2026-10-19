import React, { useState, useEffect } from 'react';
import {
  Lock,
  Database,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  FileCode,
  Terminal,
  Activity,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

export const SecurityInspector: React.FC = () => {
  const [dbDump, setDbDump] = useState<any>(null);
  const [activeTable, setActiveTable] = useState<'tokens' | 'hashes' | 'logs' | 'schema'>('tokens');
  const [sandboxCnic, setSandboxCnic] = useState<string>('42101-1234567-1');
  const [customKey, setCustomKey] = useState<string>('demo-playground-key-NOT-the-server-key');
  const [computedHmac, setComputedHmac] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Simple client-side preview for HMAC sandbox
  useEffect(() => {
    async function calculate() {
      try {
        const enc = new TextEncoder();
        const keyData = enc.encode(customKey);
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signature = await window.crypto.subtle.sign(
          'HMAC',
          cryptoKey,
          enc.encode(sandboxCnic.replace(/\D/g, ''))
        );
        const hashArray = Array.from(new Uint8Array(signature));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        setComputedHmac(hashHex);
      } catch (err) {
        console.error('HMAC preview calculation error:', err);
      }
    }
    calculate();
  }, [sandboxCnic, customKey]);

  const loadDump = () => {
    fetch('/api/database/dump')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.dump) {
          setDbDump(data.dump);
        }
      })
      .catch((err) => console.error('Database dump fetch error:', err));
  };

  useEffect(() => {
    loadDump();
  }, []);

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <Lock className="w-4 h-4" />
            Security & Trust Design
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Why Standard Hashing Fails & <span className="text-emerald-400">Why HMAC-SHA256 is Mandatory</span>
          </h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Pakistani CNICs have a predictable 13-digit structure (province prefix, family tree code, gender bit).
            There are only ~10<sup>13</sup> possible combinations. A leaked database of plain SHA-256 hashes can be
            completely reverse-engineered in minutes using modern GPUs or precomputed rainbow tables.
            BasItna uses a server-side secret HMAC key kept strictly outside the database.
          </p>
        </div>
      </div>

      {/* Transparency Guarantee Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 uppercase font-semibold">Raw CNICs Stored</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">0</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Strict Zero-Storage</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 uppercase font-semibold">CNIC Images/Scans</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">0</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Zero File Uploads</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 uppercase font-semibold">HMAC-SHA256 Hashes</div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1">
            {dbDump?.privacyGuarantee?.hmacProtectedRecords ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Keyed with server secret (env)</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 uppercase font-semibold">Audience Tokens</div>
          <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">
            {dbDump?.privacyGuarantee?.audienceBoundTokens ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Single-Use & Temporary</div>
        </div>
      </div>

      {/* Interactive HMAC Demonstration Sandbox */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            Live HMAC-SHA256 Playground (Rainbow Table Resistance)
          </h3>
          <span className="text-xs text-slate-400 font-mono">RFC 2104 Standard</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Input CNIC Number
            </label>
            <input
              type="text"
              value={sandboxCnic}
              onChange={(e) => setSandboxCnic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Fixed 13-digit space: vulnerable to offline dictionary attack if unkeyed.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Playground Key (demo only; real key lives in server env)
            </label>
            <input
              type="text"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-emerald-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              The real server key is never sent to the browser or written to the database.
            </p>
          </div>
        </div>

        {/* Computed HMAC Result */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono text-slate-400 font-semibold">
              Computed HMAC-SHA256 Digest (64 Hex Characters)
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(computedHmac);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Digest'}</span>
            </button>
          </div>
          <div className="font-mono text-xs sm:text-sm text-emerald-400 break-all bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            {computedHmac || 'Computing digest...'}
          </div>
          <p className="text-xs text-slate-400">
            Even if an attacker steals the entire database of HMAC hashes, they cannot test guessed CNIC numbers against
            it without this high-entropy secret key.
          </p>
        </div>
      </div>

      {/* PostgreSQL Database Inspector */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              Live PostgreSQL Relational Store Inspector
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct window into stored database rows. Verify for yourself: zero PII columns.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTable('tokens')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                activeTable === 'tokens' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              verification_tokens ({dbDump?.tokens?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTable('hashes')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                activeTable === 'hashes' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              identity_hashes ({dbDump?.identityHashes?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTable('logs')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                activeTable === 'logs' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              audit_logs ({dbDump?.auditLogs?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTable('schema')}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                activeTable === 'schema' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              SQL DDL
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {activeTable === 'tokens' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">token_code</th>
                  <th className="py-2.5 px-3">organization_id</th>
                  <th className="py-2.5 px-3">purpose</th>
                  <th className="py-2.5 px-3">proof_result</th>
                  <th className="py-2.5 px-3">is_used</th>
                  <th className="py-2.5 px-3">identity_hmac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dbDump?.tokens && dbDump.tokens.length > 0 ? (
                  dbDump.tokens.map((t: any) => (
                    <tr key={t.token} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{t.token}</td>
                      <td className="py-2.5 px-3 text-slate-300">{t.organizationId}</td>
                      <td className="py-2.5 px-3 text-slate-400">{t.purpose}</td>
                      <td className="py-2.5 px-3 text-cyan-300">&ldquo;{t.proofResult}&rdquo;</td>
                      <td className="py-2.5 px-3">
                        {t.used ? (
                          <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            TRUE (Burned)
                          </span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            FALSE (Active)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]">
                        {t.identityHmac ? `${t.identityHmac.slice(0, 10)}...` : t.identityHmacPreview}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                      No tokens issued yet. Issue a token from the Citizen Portal to view real-time table entries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTable === 'hashes' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">id</th>
                  <th className="py-2.5 px-3">identity_hmac (SHA-256 Digest)</th>
                  <th className="py-2.5 px-3">tokens_count</th>
                  <th className="py-2.5 px-3">first_verified_at</th>
                  <th className="py-2.5 px-3">last_active_at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dbDump?.identityHashes && dbDump.identityHashes.length > 0 ? (
                  dbDump.identityHashes.map((h: any) => (
                    <tr key={h.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-400">{h.id}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">{h.identityHmac}</td>
                      <td className="py-2.5 px-3 text-slate-300">{h.tokensCount}</td>
                      <td className="py-2.5 px-3 text-slate-400">{new Date(h.firstVerifiedAt).toLocaleTimeString()}</td>
                      <td className="py-2.5 px-3 text-slate-400">{new Date(h.lastActiveAt).toLocaleTimeString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                      No identity hash records in database yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTable === 'logs' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono">
                  <th className="py-2.5 px-3">timestamp</th>
                  <th className="py-2.5 px-3">event_type</th>
                  <th className="py-2.5 px-3">organization</th>
                  <th className="py-2.5 px-3">token_code</th>
                  <th className="py-2.5 px-3">status</th>
                  <th className="py-2.5 px-3">details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dbDump?.auditLogs && dbDump.auditLogs.length > 0 ? (
                  dbDump.auditLogs.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-400">{new Date(l.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">{l.eventType}</td>
                      <td className="py-2.5 px-3 text-slate-400">{l.organizationName}</td>
                      <td className="py-2.5 px-3 text-emerald-400">{l.tokenCode}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            l.status === 'SUCCESS'
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans truncate max-w-[240px]" title={l.details}>
                        {l.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                      No audit events logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTable === 'schema' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre overflow-x-auto leading-relaxed">
              {dbDump?.schemaSql}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
