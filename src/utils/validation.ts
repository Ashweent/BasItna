import { INSTITUTION_TYPES, InstitutionType } from '../types.js';

/** Any valid email (school, college, university or personal). No domain restriction. */
export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
  );
}

export function isInstitutionType(value: unknown): value is InstitutionType {
  return typeof value === 'string' && INSTITUTION_TYPES.some((t) => t.value === value);
}

export function institutionLabel(type: InstitutionType): string {
  return INSTITUTION_TYPES.find((t) => t.value === type)?.label ?? 'Other';
}

/** 42101-1234567-1 -> 42101-*******-1 */
export function maskCnic(cnic: string): string {
  const d = cnic.replace(/\D/g, '');
  return d.length === 13 ? `${d.slice(0, 5)}-*******-${d.slice(12)}` : '*************';
}
