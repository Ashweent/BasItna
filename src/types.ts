export type InstitutionType = 'SCHOOL' | 'COLLEGE' | 'UNIVERSITY' | 'UNDERGRADUATE' | 'POSTGRADUATE';

export const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: 'SCHOOL', label: 'School' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'UNDERGRADUATE', label: 'Undergraduate (BS / BSc / BA)' },
  { value: 'POSTGRADUATE', label: 'Postgraduate (MS / MPhil / PhD)' },
];

export interface HolderDetails {
  email: string;
  institutionType: InstitutionType;
  institutionTypeLabel: string;
  cnicMasked: string; // e.g. 42101-*******-1
}

export type VerificationPurpose = 'IDENTITY_VERIFICATION' | 'AGE_18_PLUS';

export interface Organization {
  id: string;
  name: string;
  category: 'Education' | 'Healthcare' | 'Banking' | 'Real Estate' | 'Events' | 'Government';
  description: string;
  allowedPurposes: VerificationPurpose[];
  badgeColor: string;
  /** Present in demo mode only: the sandbox UI acts as this organization. */
  demoApiKey?: string;
}

export interface IssuedTokenResponse {
  /** The citizen's own details, echoed back for display only. Never stored, never sent to organizations. */
  holder?: HolderDetails;
  success: boolean;
  token: string;
  organizationId: string;
  organizationName: string;
  purpose: VerificationPurpose;
  proofResult: string;
  expiresAt: number;
  identityHmacPrefix: string;
  message: string;
}

export interface VerificationResponse {
  success: boolean;
  valid: boolean;
  status:
    | 'SUCCESS'
    | 'EXPIRED'
    | 'ALREADY_USED'
    | 'AUDIENCE_MISMATCH'
    | 'PURPOSE_MISMATCH'
    | 'TOKEN_NOT_FOUND'
    | 'INVALID_SIGNATURE'
    | 'UNAUTHORIZED';
  message: string;
  proofResult?: string;
  organizationName?: string;
  purpose?: string;
  verifiedAt?: number;
}

export interface TokenItem {
  token: string;
  organizationId: string;
  organizationName: string;
  purpose: VerificationPurpose;
  proofResult: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  identityHmacPreview: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: 'TOKEN_ISSUED' | 'TOKEN_VERIFIED' | 'VERIFICATION_REJECTED' | 'TOKEN_EXPIRED';
  organizationId: string;
  organizationName: string;
  purpose: string;
  tokenCode: string;
  details: string;
  status: 'SUCCESS' | 'BLOCKED' | 'FLAGGED';
}

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
  score: number;
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
