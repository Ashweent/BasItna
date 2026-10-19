import { GoogleGenAI } from '@google/genai';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'file' | 'email' | 'phone' | 'date';
  required: boolean;
  sensitiveCategory?: 'CRITICAL_CNIC' | 'CRITICAL_PHOTO' | 'FAMILY_PII' | 'LOCATION_PII' | 'FINANCIAL' | 'STANDARD';
}

export interface FormTemplate {
  id: string;
  title: string;
  organization: string;
  context: string;
  hasPurposeStatement: boolean;
  hasRetentionStatement: boolean;
  fields: FormField[];
}

export interface PrivacyAnalysisResult {
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  summary: string;
  violations: {
    field: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    issue: string;
    riskDescription: string;
  }[];
  recommendations: {
    action: string;
    impact: string;
    basItnaAlternative: string;
  }[];
  minimizedFormSuggestion: {
    fieldsToKeep: string[];
    fieldsToRemove: string[];
    fieldsToReplaceWithBasItna: string[];
  };
  generatedBy: 'GEMINI_AI' | 'LOCAL_HEURISTIC';
}

export const PRESET_FORMS: FormTemplate[] = [
  {
    id: 'university-workshop',
    title: 'FAST NUCES National AI Workshop Registration',
    organization: 'FAST National University',
    context: 'A 2-day technical workshop for university students. The organizers only need to confirm attendees are valid students/citizens.',
    hasPurposeStatement: false,
    hasRetentionStatement: false,
    fields: [
      { id: 'f1', label: 'Full Legal Name', type: 'text', required: true, sensitiveCategory: 'STANDARD' },
      { id: 'f2', label: 'Email Address (School / College / University)', type: 'email', required: true, sensitiveCategory: 'STANDARD' },
      { id: 'f3', label: 'Contact Phone Number', type: 'phone', required: true, sensitiveCategory: 'STANDARD' },
      { id: 'f4', label: '13-Digit CNIC Number', type: 'text', required: true, sensitiveCategory: 'CRITICAL_CNIC' },
      { id: 'f5', label: 'CNIC Front & Back Scanned Copy (PDF/JPG)', type: 'file', required: true, sensitiveCategory: 'CRITICAL_PHOTO' },
      { id: 'f6', label: "Father's Name & Father's CNIC", type: 'text', required: true, sensitiveCategory: 'FAMILY_PII' },
      { id: 'f7', label: 'Permanent Home Address', type: 'text', required: false, sensitiveCategory: 'LOCATION_PII' },
    ],
  },
  {
    id: 'society-visitor-pass',
    title: 'Gated Residential Society Visitor Pass Application',
    organization: 'Askari Heights Management',
    context: 'Daily visitor verification at entry gate to verify identity of contractors, delivery staff, and guests.',
    hasPurposeStatement: true,
    hasRetentionStatement: false,
    fields: [
      { id: 'v1', label: 'Visitor Full Name', type: 'text', required: true, sensitiveCategory: 'STANDARD' },
      { id: 'v2', label: 'Mobile Phone Number', type: 'phone', required: true, sensitiveCategory: 'STANDARD' },
      { id: 'v3', label: 'Original CNIC Card (Leave at Gate or Upload Scan)', type: 'file', required: true, sensitiveCategory: 'CRITICAL_PHOTO' },
      { id: 'v4', label: 'Host Resident Flat Number', type: 'text', required: true, sensitiveCategory: 'STANDARD' },
      { id: 'v5', label: 'Vehicle Registration Number', type: 'text', required: false, sensitiveCategory: 'STANDARD' },
    ],
  },
  {
    id: 'job-application',
    title: 'Tech Company Junior Software Engineer Application',
    organization: 'FinTech Innovations Pvt Ltd',
    context: 'Candidate preliminary screening for fresh graduates. The company only needs to verify eligibility and age.',
    hasPurposeStatement: true,
    hasRetentionStatement: true,
    fields: [
      { id: 'j1', label: 'Applicant Name', type: 'text', required: true, sensitiveCategory: 'STANDARD' },
      { id: 'j2', label: 'Email Address', type: 'email', required: true, sensitiveCategory: 'STANDARD' },
      { id: 'j3', label: 'LinkedIn / Portfolio URL', type: 'text', required: false, sensitiveCategory: 'STANDARD' },
      { id: 'j4', label: 'CNIC Copy for Identity & Age Verification (18+)', type: 'file', required: true, sensitiveCategory: 'CRITICAL_PHOTO' },
      { id: 'j5', label: 'Current Residential City', type: 'text', required: true, sensitiveCategory: 'STANDARD' },
    ],
  },
];

/**
 * Automatic sensitive-data detection: derives the sensitivity category of a field from its label/type.
 */
export function detectSensitiveCategory(field: Pick<FormField, 'label' | 'type'>): NonNullable<FormField['sensitiveCategory']> {
  const l = field.label.toLowerCase();
  const isCnic = /cnic|identity card|national id|nic\b/.test(l);
  const isCopy = /copy|scan|photo|image|picture|upload/.test(l) || field.type === 'file';
  if (isCnic && isCopy) return 'CRITICAL_PHOTO';
  if (isCnic && /father|mother|guardian/.test(l)) return 'FAMILY_PII';
  if (isCnic) return 'CRITICAL_CNIC';
  if (/father|mother|guardian|spouse/.test(l)) return 'FAMILY_PII';
  if (/address|permanent|residence/.test(l) && !/city/.test(l)) return 'LOCATION_PII';
  if (/bank|account|iban|salary|income|credit card/.test(l)) return 'FINANCIAL';
  return 'STANDARD';
}

/**
 * Fallback heuristic privacy scoring algorithm
 */
export function analyzeFormLocally(form: FormTemplate): PrivacyAnalysisResult {
  let score = 100;
  const violations: PrivacyAnalysisResult['violations'] = [];
  const recommendations: PrivacyAnalysisResult['recommendations'] = [];
  const fieldsToKeep: string[] = [];
  const fieldsToRemove: string[] = [];
  const fieldsToReplaceWithBasItna: string[] = [];

  for (const field of form.fields) {
    const labelLower = field.label.toLowerCase();
    const isCnic = labelLower.includes('cnic') || labelLower.includes('identity card');
    const isPhotoOrCopy = labelLower.includes('copy') || labelLower.includes('scan') || labelLower.includes('photo') || field.type === 'file';
    const isFatherOrFamily = labelLower.includes('father') || labelLower.includes('mother') || labelLower.includes('guardian');
    const isAddress = labelLower.includes('address') || labelLower.includes('permanent');

    if (isCnic && isPhotoOrCopy) {
      score -= 35;
      violations.push({
        field: field.label,
        severity: 'CRITICAL',
        issue: 'Invasive Identity Document Imaging',
        riskDescription: 'Requiring scans or photos of physical CNIC exposes full name, DOB, father name, permanent address, family tree tracking number, and signature to unencrypted Google Forms or cloud drives.',
      });
      fieldsToReplaceWithBasItna.push(field.label);
    } else if (isCnic) {
      score -= 25;
      violations.push({
        field: field.label,
        severity: 'HIGH',
        issue: 'Raw 13-Digit CNIC Number Collection',
        riskDescription: 'Direct collection of raw CNIC numbers allows unauthorized cross-database profiling, identity theft, and SIM registration abuse.',
      });
      fieldsToReplaceWithBasItna.push(field.label);
    } else if (isFatherOrFamily) {
      score -= 15;
      violations.push({
        field: field.label,
        severity: 'MEDIUM',
        issue: 'Secondary Family PII Collection',
        riskDescription: 'Collecting parents’ CNIC numbers violates data minimization principles when only the applicant is participating.',
      });
      fieldsToRemove.push(field.label);
    } else if (isAddress && !field.label.toLowerCase().includes('city')) {
      score -= 10;
      violations.push({
        field: field.label,
        severity: 'MEDIUM',
        issue: 'Excessive Location Granularity',
        riskDescription: 'Permanent home address is unnecessary for event access or preliminary screening; city level is sufficient.',
      });
      fieldsToRemove.push(field.label);
    } else {
      fieldsToKeep.push(field.label);
    }
  }

  if (!form.hasPurposeStatement) {
    score -= 10;
    violations.push({
      field: 'Form Metadata',
      severity: 'MEDIUM',
      issue: 'Missing Explicit Processing Purpose',
      riskDescription: 'Participants are not informed why their sensitive identifiers are required or how they will be utilized.',
    });
  }

  if (!form.hasRetentionStatement) {
    score -= 10;
    violations.push({
      field: 'Data Retention Policy',
      severity: 'MEDIUM',
      issue: 'Indefinite Data Retention Risk',
      riskDescription: 'No stated timeline for purging submitted personal credentials after the event/process concludes.',
    });
  }

  score = Math.max(5, Math.min(100, score));

  let grade: PrivacyAnalysisResult['grade'] = 'F';
  let riskLevel: PrivacyAnalysisResult['riskLevel'] = 'CRITICAL';

  if (score >= 90) {
    grade = 'A+';
    riskLevel = 'LOW';
  } else if (score >= 80) {
    grade = 'A';
    riskLevel = 'LOW';
  } else if (score >= 65) {
    grade = 'B';
    riskLevel = 'MODERATE';
  } else if (score >= 50) {
    grade = 'C';
    riskLevel = 'HIGH';
  } else if (score >= 35) {
    grade = 'D';
    riskLevel = 'HIGH';
  }

  recommendations.push({
    action: 'Adopt BasItna Audience-Bound Tokens',
    impact: 'Eliminates 100% of raw CNIC and document photo liability from your database.',
    basItnaAlternative: 'Embed a 1-click "Verify with BasItna" field that passes a temporary single-use token BI-XXXX-XXXX yielding only "Identity Verified".',
  });

  if (fieldsToRemove.length > 0) {
    recommendations.push({
      action: `Drop unnecessary secondary fields (${fieldsToRemove.join(', ')})`,
      impact: 'Reduces form abandonment and complies with global Data Minimization guidelines.',
      basItnaAlternative: 'Discard family identifier fields entirely.',
    });
  }

  recommendations.push({
    action: 'Add a 30-Day Auto-Purge Notice',
    impact: 'Assures participants their records are deleted upon verification check.',
    basItnaAlternative: 'BasItna tokens auto-expire within 24 hours automatically.',
  });

  return {
    score,
    grade,
    riskLevel,
    summary: `This form scores ${score}/100 (${grade}). It requests high-risk identifiers that can be completely replaced by BasItna proof verification without compromising verification integrity.`,
    violations,
    recommendations,
    minimizedFormSuggestion: {
      fieldsToKeep,
      fieldsToRemove,
      fieldsToReplaceWithBasItna,
    },
    generatedBy: 'LOCAL_HEURISTIC',
  };
}

/**
 * Analyzes form using a Gemini model (GEMINI_MODEL, default gemini-2.5-flash) when GEMINI_API_KEY is available
 */
export async function analyzeFormWithGemini(form: FormTemplate): Promise<PrivacyAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return analyzeFormLocally(form);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are an expert Data Privacy Auditor specializing in digital identity privacy, the principle of Data Minimization, and Pakistani identity context (CNIC, NADRA).
Analyze the following registration form created by an organization:

Form Title: "${form.title}"
Organization: "${form.organization}"
Context: "${form.context}"
Explicit Purpose Stated: ${form.hasPurposeStatement ? 'Yes' : 'No'}
Explicit Retention Policy: ${form.hasRetentionStatement ? 'Yes' : 'No'}
Fields Requested:
${form.fields.map((f, i) => `${i + 1}. Label: "${f.label}", Type: "${f.type}", Required: ${f.required}`).join('\n')}

Problem Context:
In Pakistan, organizations needlessly ask for CNIC numbers and CNIC scanned copies through Google Forms, storing them in spreadsheets and insecure cloud drives.
BasItna provides "Proof, Not Data": an audience-bound, HMAC-protected verification token (e.g. BI-8F29-X72P) that only returns "Identity Verified" or "18+ Verified" without exposing CNIC number, CNIC image, or date of birth.

Return a strict JSON object with this exact structure:
{
  "score": <number between 5 and 100>,
  "grade": <"A+" | "A" | "B" | "C" | "D" | "F">,
  "riskLevel": <"LOW" | "MODERATE" | "HIGH" | "CRITICAL">,
  "summary": "<concise 2-sentence executive summary of privacy risks in this form>",
  "violations": [
    {
      "field": "<field name>",
      "severity": "<"CRITICAL" | "HIGH" | "MEDIUM">",
      "issue": "<concise title>",
      "riskDescription": "<why collecting this exposes users and violates data minimization>"
    }
  ],
  "recommendations": [
    {
      "action": "<concise action>",
      "impact": "<privacy impact>",
      "basItnaAlternative": "<how BasItna solves it>"
    }
  ],
  "minimizedFormSuggestion": {
    "fieldsToKeep": ["<fields that are safe and legitimate>"],
    "fieldsToRemove": ["<fields that should be dropped entirely>"],
    "fieldsToReplaceWithBasItna": ["<fields like CNIC or CNIC photos that should be replaced with a BasItna Proof token>"]
  }
}
Only output valid JSON.
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text) as PrivacyAnalysisResult;
    return {
      ...parsed,
      generatedBy: 'GEMINI_AI',
    };
  } catch (err) {
    console.warn('Gemini analysis error, falling back to local analyzer:', err);
    return analyzeFormLocally(form);
  }
}
