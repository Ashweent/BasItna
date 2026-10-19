import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Database,
  Lock,
  Sparkles,
  ExternalLink,
  Target,
  Compass,
  CheckCircle2,
  Users,
  Fingerprint,
} from 'lucide-react';

export const WorkflowGuide: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border border-teal-500/20 rounded-2xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-3">
            <Cpu className="w-4 h-4" />
            Hackathon System Architecture & Technical Specifications
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            BasItna: <span className="text-teal-400">&ldquo;Proof, Not Data.&rdquo;</span> — Bas itna hi chahiye.
          </h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            BasItna re-architects the digital identity verification paradigm for Pakistani organizations, replacing
            unregulated CNIC hoarding with temporary, audience-bound zero-knowledge proofs.
          </p>
        </div>
      </div>

      {/* Section 6: System Workflow Visual Flowchart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-teal-400" />
          End-to-End System Workflow (Section 6)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center relative space-y-1.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center mx-auto">
              1
            </div>
            <div className="font-bold text-xs text-white">CITIZEN</div>
            <div className="text-[11px] text-slate-400">Initiates verification on BasItna platform</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center relative space-y-1.5">
            <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold flex items-center justify-center mx-auto">
              2
            </div>
            <div className="font-bold text-xs text-teal-300">Mock NADRA Check</div>
            <div className="text-[11px] text-slate-400">Validates citizen record status & DOB behind isolated API</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center relative space-y-1.5">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center mx-auto">
              3
            </div>
            <div className="font-bold text-xs text-cyan-300">HMAC-SHA256</div>
            <div className="text-[11px] text-slate-400">Hashes identity with server secret key. Raw CNIC dropped.</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center relative space-y-1.5">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center mx-auto">
              4
            </div>
            <div className="font-bold text-xs text-purple-300">Audience Token</div>
            <div className="text-[11px] text-slate-400">Token generated (BI-8F29-X72P) bound to one organization & purpose</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center relative space-y-1.5">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center mx-auto">
              5
            </div>
            <div className="font-bold text-xs text-blue-300">Organization Gate</div>
            <div className="text-[11px] text-slate-400">Organization checks token via API or portal</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Step 6 */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center relative space-y-1.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 text-xs font-black flex items-center justify-center mx-auto">
              ✓
            </div>
            <div className="font-bold text-xs text-emerald-400">Verified Result</div>
            <div className="text-[11px] text-emerald-300">&ldquo;Identity Verified&rdquo; or &ldquo;18+ Verified&rdquo;</div>
          </div>
        </div>
      </div>

      {/* Section 7: Technology Stack Breakdown Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
          <Layers className="w-5 h-5 text-teal-400" />
          Specified Technology Stack (Section 7)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Layer</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Technology</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Implementation Role in BasItna</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-3 px-4 font-bold text-emerald-400">Frontend</td>
                <td className="py-3 px-4 font-semibold text-white">React, Tailwind CSS, Motion</td>
                <td className="py-3 px-4 text-slate-300">
                  Interactive multi-portal web UI for citizens, organizations, and auditors with real-time responsive states.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-blue-400">Backend</td>
                <td className="py-3 px-4 font-semibold text-white">Node.js / Express (server.ts)</td>
                <td className="py-3 px-4 text-slate-300">
                  REST endpoints for Mock NADRA verification, HMAC-SHA256 generation, token issuance, redemption, and audit trails.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-cyan-400">Database</td>
                <td className="py-3 px-4 font-semibold text-white">PostgreSQL (Relational Store)</td>
                <td className="py-3 px-4 text-slate-300">
                  Strict zero-PII schema storing organizations, identity_hmac hashes, audience_tokens, and audit_logs.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-amber-400">Security</td>
                <td className="py-3 px-4 font-semibold text-white">HMAC-SHA256, Secret Salt, Audience-Bound Tokens</td>
                <td className="py-3 px-4 text-slate-300">
                  Protects against CNIC rainbow-table attacks; prevents replay and cross-organization token re-use.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-purple-400">AI Layer</td>
                <td className="py-3 px-4 font-semibold text-white">Gemini (@google/genai)</td>
                <td className="py-3 px-4 text-slate-300">
                  Sensitive-data detection, Google Form privacy scoring, and automated data-minimization recommendation generation.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 10 & 11: Future Scope & Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            10. Future Scope
          </div>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
            <li>Production integration with licensed NADRA verification partner (replacing mock function)</li>
            <li>Extended selective disclosure: Student enrollment proof, degree verification, employment status</li>
            <li>Bank/KYC integration complying with State Bank of Pakistan digital onboarding directives</li>
            <li>Cryptographic W3C Verifiable Credentials & Zero-Knowledge Snarks (ZK-SNARKs)</li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            11. Expected Impact
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            BasItna aims to reduce unnecessary collection and exposure of sensitive personal information while giving
            users greater control over their digital identity in Pakistan. Instead of repeatedly handing over copies of
            identity documents, people can prove only the required fact.
          </p>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-serif italic text-xs text-center text-emerald-300">
            &ldquo;BasItna — Prove Who You Are. Don&apos;t Hand Over Your Identity.&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
};
