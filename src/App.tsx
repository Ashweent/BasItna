import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { CitizenPortal } from './components/CitizenPortal.js';
import { OrganizationPortal } from './components/OrganizationPortal.js';
import { FormPrivacyAnalyzer } from './components/FormPrivacyAnalyzer.js';
import { SecurityInspector } from './components/SecurityInspector.js';
import { WorkflowGuide } from './components/WorkflowGuide.js';
import { Organization, TokenItem, IssuedTokenResponse, VerificationPurpose } from './types.js';
import { ShieldCheck, Database, Lock, Cpu, Sparkles, Heart } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'citizen' | 'organization' | 'analyzer' | 'security' | 'workflow'>('citizen');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [tokensList, setTokensList] = useState<TokenItem[]>([]);
  const [prefilledToken, setPrefilledToken] = useState<string>('');
  const [prefilledOrgId, setPrefilledOrgId] = useState<string>('fast-nuces');
  const [prefilledPurpose, setPrefilledPurpose] = useState<VerificationPurpose>('IDENTITY_VERIFICATION');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Fetch initial organizations
  const loadOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();
      if (data.success && data.organizations) {
        setOrganizations(data.organizations);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  // Fetch active tokens
  const loadTokens = async () => {
    try {
      const res = await fetch('/api/tokens/list');
      const data = await res.json();
      if (data.success && data.tokens) {
        setTokensList(data.tokens);
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
    }
  };

  useEffect(() => {
    loadOrganizations();
    loadTokens();
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      await loadOrganizations();
      await loadTokens();
      setPrefilledToken('');
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleTokenGenerated = (tokenData: IssuedTokenResponse) => {
    setPrefilledToken(tokenData.token);
    setPrefilledOrgId(tokenData.organizationId);
    setPrefilledPurpose(tokenData.purpose);
    loadTokens();
  };

  const handleNavigateToOrgPortal = (tokenCode: string, orgId: string, purpose: string) => {
    setPrefilledToken(tokenCode);
    setPrefilledOrgId(orgId);
    setPrefilledPurpose(purpose as VerificationPurpose);
    setActiveTab('organization');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleReset}
        isResetting={isResetting}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'citizen' && (
          <CitizenPortal
            organizations={organizations}
            onTokenGenerated={handleTokenGenerated}
            onNavigateToOrgPortal={handleNavigateToOrgPortal}
          />
        )}

        {activeTab === 'organization' && (
          <OrganizationPortal
            organizations={organizations}
            tokensList={tokensList}
            prefilledToken={prefilledToken}
            prefilledOrgId={prefilledOrgId}
            prefilledPurpose={prefilledPurpose}
            onVerificationDone={loadTokens}
          />
        )}

        {activeTab === 'analyzer' && <FormPrivacyAnalyzer />}

        {activeTab === 'security' && <SecurityInspector />}

        {activeTab === 'workflow' && <WorkflowGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white text-sm">BasItna</span>
            <span className="text-slate-600">•</span>
            <span>&ldquo;Proof, Not Data.&rdquo; — Bas itna hi chahiye.</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> HMAC-SHA256
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-cyan-400">
              <Database className="w-3.5 h-3.5" /> PostgreSQL Layer
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-purple-400">
              <Sparkles className="w-3.5 h-3.5" /> Gemini AI
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-blue-400">
              <Lock className="w-3.5 h-3.5" /> Mock NADRA Sandbox
            </span>
          </div>

          <div className="text-slate-500 text-[11px]">
            Hackathon MVP • Designed for Pakistani Identity Workflows
          </div>
        </div>
      </footer>
    </div>
  );
}
