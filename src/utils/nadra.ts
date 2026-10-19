import { NadraCitizen, calculateIs18Plus, normalizeCnic, isValidCnic } from './crypto.js';

export const MOCK_CITIZENS: NadraCitizen[] = [
  {
    cnic: '42101-1234567-1',
    fullName: 'Tariq Mehmood',
    dateOfBirth: '1994-06-15',
    gender: 'M',
    isAlive: true,
    city: 'Karachi',
  },
  {
    cnic: '61101-8765432-2',
    fullName: 'Ayesha Fatima',
    dateOfBirth: '2001-11-20',
    gender: 'F',
    isAlive: true,
    city: 'Islamabad',
  },
  {
    cnic: '35201-9988776-3',
    fullName: 'Zainab Bilgrami',
    dateOfBirth: '2009-08-14', // 17 years old in 2026
    gender: 'F',
    isAlive: true,
    city: 'Lahore',
  },
  {
    cnic: '17301-4433221-5',
    fullName: 'Bilal Ahmed',
    dateOfBirth: '1988-03-02',
    gender: 'M',
    isAlive: true,
    city: 'Peshawar',
  },
  {
    cnic: '54401-5566778-9',
    fullName: 'Sana Rehman',
    dateOfBirth: '1999-01-25',
    gender: 'F',
    isAlive: true,
    city: 'Quetta',
  },
  {
    cnic: '42201-3344556-7',
    fullName: 'Kamran Siddiqui',
    dateOfBirth: '1975-09-09',
    gender: 'M',
    isAlive: false, // used to demo a suspended / deceased record
    city: 'Karachi',
  },
];

export interface NadraVerificationResponse {
  success: boolean;
  message: string;
  /** Only the minimum facts the server needs. Never returned to browsers. */
  citizen?: {
    isAlive: boolean;
    is18Plus: boolean;
  };
  mockNotice: string;
}

/**
 * Mock NADRA verification service (Section 5 of the proposal):
 * a SMALL SET of dummy CNICs with fake names and dates of birth behind ONE function,
 * verifyWithNadra(cnic). In production only this function is replaced by an integration
 * through a licensed verification partner. No real CNIC data is used anywhere.
 *
 * Any CNIC that is not in MOCK_CITIZENS is rejected (no synthetic records are invented).
 */
export function verifyWithNadra(rawCnic: string): NadraVerificationResponse {
  if (!isValidCnic(rawCnic)) {
    return {
      success: false,
      message: 'Invalid CNIC format. Pakistani CNIC must contain exactly 13 digits (XXXXX-XXXXXXX-X).',
      mockNotice: 'NADRA Verification Gateway: Invalid format check.',
    };
  }

  const normalized = normalizeCnic(rawCnic);
  const found = MOCK_CITIZENS.find((c) => c.cnic === normalized);

  if (!found) {
    return {
      success: false,
      message: 'Identity could not be verified: no matching record in the Mock NADRA registry.',
      mockNotice: 'Mock NADRA Sandbox: CNIC not present in the synthetic registry.',
    };
  }

  if (!found.isAlive) {
    return {
      success: false,
      message: 'Identity record flagged as deceased or suspended in NADRA registry.',
      mockNotice: 'Mock NADRA Record: Record status suspended.',
    };
  }

  return {
    success: true,
    message: 'Valid identity confirmed in Mock NADRA citizen registry.',
    citizen: {
      isAlive: found.isAlive,
      is18Plus: calculateIs18Plus(found.dateOfBirth),
    },
    mockNotice: 'Mock NADRA Sandbox: Verified against synthetic citizen registry.',
  };
}
