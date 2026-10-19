import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Database, Sparkles, RefreshCw, KeyRound, FileCheck2, Cpu } from 'lucide-react';

interface HeaderProps {
  activeTab: 'citizen' | 'organization' | 'analyzer' | 'security' | 'workflow';
  setActiveTab: (tab: 'citizen' | 'organization' | 'analyzer' | 'security' | 'workflow') => void;
  onReset: () => void;
  isResetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onReset,
  isResetting,
}) => {
  const [storage, setStorage] = useState<string>('...');
  const [cnicCount, setCnicCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/health')
        .then((r) => r.json())
        .then((h) => {
          if (!alive) return;
          setStorage(h.storage === 'postgresql' ? 'PostgreSQL' : 'In-memory (set DATABASE_URL)');
          setCnicCount(typeof h.rawCnicStored === 'number' ? h.rawCnicStored : null);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [isResetting]);

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <ShieldCheck className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white font-mono">BasItna</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  v1.0 MVP
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hidden sm:inline-flex items-center gap-1 font-mono">
                  <Database className="w-3 h-3" /> {storage}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                <span className="text-emerald-400 font-semibold">&ldquo;Proof, Not Data.&rdquo;</span> — Bas itna hi chahiye.
              </p>
            </div>
          </div>

          {/* Quick Badges & Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-slate-400">HMAC-SHA256 Secret Keyed</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">{cnicCount ?? '?'} CNICs Stored</span>
            </div>

            <button
              onClick={onReset}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
              title="Reset sandbox tokens and audit logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-800/60 pt-2">
          <button
            onClick={() => setActiveTab('citizen')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'citizen'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>1. Citizen Verification</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${activeTab === 'citizen' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
              Issue Proof
            </span>
          </button>

          <button
            onClick={() => setActiveTab('organization')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'organization'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>2. Organization Portal</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${activeTab === 'organization' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
              Redeem Token
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analyzer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'analyzer'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>3. AI Form Privacy Score</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${activeTab === 'analyzer' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
              Audit & Minimize
            </span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>4. Security & Cryptography</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${activeTab === 'security' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
              HMAC & DB Audit
            </span>
          </button>

          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'workflow'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Architecture & Specs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
