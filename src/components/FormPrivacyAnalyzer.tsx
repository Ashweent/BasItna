import React, { useState, useEffect } from 'react';
import { FormTemplate, PrivacyAnalysisResult, FormField } from '../types.js';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers,
  HelpCircle,
  Plus,
  Trash2,
  Lock,
  UploadCloud,
  Check,
} from 'lucide-react';

export const FormPrivacyAnalyzer: React.FC = () => {
  const [presetForms, setPresetForms] = useState<FormTemplate[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('university-workshop');
  const [customForm, setCustomForm] = useState<FormTemplate | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<PrivacyAnalysisResult | null>(null);
  const [viewMode, setViewMode] = useState<'audit' | 'preview_before' | 'preview_after'>('audit');

  // Load preset forms on mount
  useEffect(() => {
    fetch('/api/preset-forms')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.forms) {
          setPresetForms(data.forms);
          if (data.forms.length > 0) {
            setCustomForm(JSON.parse(JSON.stringify(data.forms[0])));
            // Run initial audit on the first form
            runAudit(data.forms[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to load preset forms:', err));
  }, []);

  const handleSelectPreset = (formId: string) => {
    setSelectedFormId(formId);
    const found = presetForms.find((f) => f.id === formId);
    if (found) {
      const cloned = JSON.parse(JSON.stringify(found));
      setCustomForm(cloned);
      runAudit(cloned);
    }
  };

  const runAudit = async (targetForm?: FormTemplate) => {
    const formToAnalyze = targetForm || customForm;
    if (!formToAnalyze) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: formToAnalyze }),
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
      }
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddField = () => {
    if (!customForm) return;
    const newField: FormField = {
      id: `f_${Date.now()}`,
      label: 'New Requested Field',
      type: 'text',
      required: true,
      sensitiveCategory: 'STANDARD',
    };
    setCustomForm({
      ...customForm,
      fields: [...customForm.fields, newField],
    });
  };

  const handleRemoveField = (id: string) => {
    if (!customForm) return;
    setCustomForm({
      ...customForm,
      fields: customForm.fields.filter((f) => f.id !== id),
    });
  };

  const handleFieldChange = (id: string, label: string, type: any) => {
    if (!customForm) return;
    setCustomForm({
      ...customForm,
      fields: customForm.fields.map((f) => (f.id === id ? { ...f, label, type } : f)),
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (score >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-3">
            <Sparkles className="w-4 h-4" />
            AI-Assisted Privacy Scoring & Data Minimization
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Analyze Google Forms for <span className="text-purple-400">Data Over-Collection</span>
          </h2>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Organizations in Pakistan commonly ask for CNIC numbers and physical card scans on Google Forms without
            stating retention or purpose. BasItna&apos;s AI analyzes form questions, scores privacy liability from 0 to 100,
            and demonstrates how to replace invasive fields with single-use verification proofs.
          </p>
        </div>
      </div>

      {/* Preset Selector & View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Sample Google Forms:
          </span>
          {presetForms.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                selectedFormId === p.id
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500 ring-1 ring-purple-500'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {p.title.split(' ')[0]} {p.title.split(' ')[1]}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('audit')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'audit' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            AI Audit Report
          </button>
          <button
            onClick={() => setViewMode('preview_before')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'preview_before' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Traditional Google Form
          </button>
          <button
            onClick={() => setViewMode('preview_after')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'preview_after' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            BasItna Minimized Form
          </button>
        </div>
      </div>

      {/* Main Content Area based on View Mode */}
      {viewMode === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Fields Inspector / Customizer */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Form Questions & Fields
              </h3>
              <button
                type="button"
                onClick={handleAddField}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Field
              </button>
            </div>

            {customForm && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {customForm.fields.map((f) => {
                  const isCnic = f.label.toLowerCase().includes('cnic');
                  const isPhoto = f.type === 'file' || f.label.toLowerCase().includes('copy') || f.label.toLowerCase().includes('scan');
                  return (
                    <div
                      key={f.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCnic && isPhoto
                          ? 'border-rose-500/40 bg-rose-500/5'
                          : isCnic
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : 'border-slate-800 bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <input
                          type="text"
                          value={f.label}
                          onChange={(e) => handleFieldChange(f.id, e.target.value, f.type)}
                          className="bg-transparent text-sm text-slate-200 font-medium focus:outline-none focus:border-b border-purple-500 w-full"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveField(f.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                          title="Remove field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-xs">
                        <select
                          value={f.type}
                          onChange={(e) => handleFieldChange(f.id, f.label, e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300 text-xs cursor-pointer"
                        >
                          <option value="text">Text Input</option>
                          <option value="file">File Upload (Scan/Photo)</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                        </select>

                        {isCnic && isPhoto && (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                            Critical Risk (CNIC Scan)
                          </span>
                        )}
                        {isCnic && !isPhoto && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                            High Risk (Raw CNIC)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Metadata checks */}
            {customForm && (
              <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customForm.hasPurposeStatement}
                    onChange={(e) => setCustomForm({ ...customForm, hasPurposeStatement: e.target.checked })}
                    className="accent-purple-500 rounded"
                  />
                  <span>Form includes stated data processing purpose</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customForm.hasRetentionStatement}
                    onChange={(e) => setCustomForm({ ...customForm, hasRetentionStatement: e.target.checked })}
                    className="accent-purple-500 rounded"
                  />
                  <span>Form includes explicit data retention timeline</span>
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={() => runAudit()}
              disabled={isAnalyzing}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Re-Evaluate Privacy Score</span>
                </>
              )}
            </button>
          </div>

          {/* AI Analysis Report Card */}
          <div className="lg:col-span-7 space-y-6">
            {analysisResult ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                {/* Score Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      BasItna Privacy Score
                    </div>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className={`text-5xl font-black ${getScoreColor(analysisResult.score).split(' ')[0]}`}>
                        {analysisResult.score}
                      </span>
                      <span className="text-xl font-bold text-slate-500">/ 100</span>
                      <span
                        className={`text-lg font-black px-3 py-0.5 rounded-xl border ${getScoreColor(
                          analysisResult.score
                        )}`}
                      >
                        Grade: {analysisResult.grade}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        analysisResult.riskLevel === 'CRITICAL' || analysisResult.riskLevel === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Risk Level: {analysisResult.riskLevel}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Powered by {analysisResult.generatedBy === 'GEMINI_AI' ? 'Gemini AI' : 'Privacy Heuristic Engine'}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-300 leading-relaxed">
                  {analysisResult.summary}
                </div>

                {/* Violations List */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Detected Data-Collection Violations ({analysisResult.violations.length})
                  </h4>
                  <div className="space-y-2.5">
                    {analysisResult.violations.map((v, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-xs">{v.field}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              v.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {v.severity}
                          </span>
                        </div>
                        <div className="font-semibold text-xs text-rose-300 mt-1">{v.issue}</div>
                        <div className="text-xs text-slate-400 mt-1 leading-normal">{v.riskDescription}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Data Minimization Recommendations
                  </h4>
                  <div className="space-y-3">
                    {analysisResult.recommendations.map((r, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5"
                      >
                        <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                          <span>{i + 1}. {r.action}</span>
                        </div>
                        <div className="text-xs text-slate-300">
                          <strong className="text-white">Impact:</strong> {r.impact}
                        </div>
                        <div className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                          <strong className="text-emerald-300">BasItna Solution:</strong> {r.basItnaAlternative}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to Action Button to view Transformation */}
                <button
                  type="button"
                  onClick={() => setViewMode('preview_after')}
                  className="w-full py-3 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>See How Form Transforms with BasItna 1-Click Proof</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-900/60 border border-slate-800 rounded-2xl">
                Loading Privacy Audit...
              </div>
            )}
          </div>
        </div>
      )}

      {/* View: Traditional Invasive Google Form */}
      {viewMode === 'preview_before' && (
        <div className="max-w-2xl mx-auto bg-slate-900 border-2 border-rose-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Current Traditional Workflow (High Risk)</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              Score: {analysisResult?.score || 25}/100 (Grade F)
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-white">{customForm?.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{customForm?.context}</p>
            </div>

            {customForm?.fields.map((field) => {
              const isCnic = field.label.toLowerCase().includes('cnic');
              return (
                <div
                  key={field.id}
                  className={`p-4 rounded-xl border ${
                    isCnic ? 'bg-rose-500/10 border-rose-500/40' : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>{field.label} {field.required && <span className="text-rose-400">*</span>}</span>
                    {isCnic && (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                        Invasive Liability
                      </span>
                    )}
                  </label>

                  {field.type === 'file' ? (
                    <div className="border-2 border-dashed border-rose-500/40 rounded-lg p-4 text-center text-xs text-slate-400 bg-slate-950/40">
                      <UploadCloud className="w-6 h-6 text-rose-400 mx-auto mb-1" />
                      <span>Upload CNIC Card Photo (Front & Back PDF/JPG)</span>
                      <div className="text-[10px] text-rose-300 mt-1 font-semibold">
                        ⚠️ High breach risk: uploaded scans are stored permanently in organizer&apos;s personal Google Drive.
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      disabled
                      placeholder={`Enter ${field.label}...`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500"
                    />
                  )}
                </div>
              );
            })}

            <div className="pt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">Google Forms Simulation</span>
              <button
                type="button"
                onClick={() => setViewMode('preview_after')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Fix This Form with BasItna</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View: BasItna Minimized Form */}
      {viewMode === 'preview_after' && (
        <div className="max-w-2xl mx-auto bg-slate-900 border-2 border-emerald-500/60 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>BasItna Privacy-Preserving Workflow (Data Minimized)</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              Score: 98/100 (Grade A+)
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-white">{customForm?.title}</h3>
              <p className="text-xs text-emerald-400/90 mt-1">
                ✓ Protected with BasItna Zero-Knowledge Identity Proofs.
              </p>
            </div>

            {/* Standard legitimate fields kept */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Full Legal Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                disabled
                value="Tariq Mehmood"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Email Address (School / College / University) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                disabled
                value="tariq@nu.edu.pk"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300"
              />
            </div>

            {/* The BasItna Selective Disclosure Replacement */}
            <div className="p-5 rounded-xl bg-emerald-950/20 border-2 border-emerald-500/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Identity Verification Proof <span className="text-emerald-400">*</span>
                </label>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  Replaces CNIC & Card Photo Scans
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="BI-8F29-X72P"
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-3 py-2.5 text-xs font-mono font-bold text-emerald-400 tracking-wider"
                />
                <button
                  type="button"
                  className="px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Verified
                </button>
              </div>

              <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  The organization receives: <strong className="text-emerald-300">&ldquo;Identity Verified&rdquo;</strong>.
                  Zero CNIC digits, zero father details, zero photos stored.
                </span>
              </div>
            </div>

            {/* Retention declaration */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
              <strong className="text-white">Data Retention Notice:</strong> Temporary verification proof expires in 24 hours. No identity records retained.
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode('audit')}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Return to Audit Report
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview_before')}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Compare with Invasive Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
