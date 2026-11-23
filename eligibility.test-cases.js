// Example cases for checking the eligibility rules by hand.
// There is no test framework in this prototype. To check a case, call
// evaluateSchemeForMember(scheme, member, FIXED_TODAY) and compare with expectedStatus.
// Dates are fixed so the results do not change over time.

const FIXED_TODAY = new Date('2025-06-01T00:00:00.000Z');

// Build a small test scheme. The defaults are an open, verified, published scheme.
function makeScheme(overrides = {}) {
  return {
    id: 'SCH-TEST',
    name: 'TEST: example scheme (sample)',
    status: 'published',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-12-31T00:00:00.000Z',
    verificationStatus: 'verified',
    eligibility: {
      ageMin: 15, ageMax: 25, incomeMax: 200000, occupations: ['Student'],
      educations: null, state: 'Telangana', districts: null,
      landholdingMaxAcres: null, gender: null,
    },
    ...overrides,
  };
}

const eligibleStudent = {
  name: 'Test Student', age: 18, familyIncome: 120000, occupation: 'Student',
  education: 'Intermediate/12th', state: 'Telangana', district: 'Hyderabad',
};

export const ELIGIBILITY_TEST_CASES = [
  {
    description: 'Every rule is met and the scheme is open and verified',
    scheme: makeScheme(),
    member: eligibleStudent,
    expectedStatus: 'Likely eligible',
  },
  {
    description: 'Scheme end date is before today',
    scheme: makeScheme({ endDate: '2025-03-01T00:00:00.000Z' }),
    member: eligibleStudent,
    expectedStatus: 'Scheme closed',
  },
  {
    description: 'Scheme is verified but not yet verified by officials',
    scheme: makeScheme({ verificationStatus: 'awaiting' }),
    member: eligibleStudent,
    expectedStatus: 'Awaiting official verification',
  },
  {
    description: 'Family income is above the limit',
    scheme: makeScheme(),
    member: { ...eligibleStudent, familyIncome: 500000 },
    expectedStatus: 'Not matching current conditions',
  },
  {
    description: 'Family income is missing, all other rules are met',
    scheme: makeScheme(),
    member: { ...eligibleStudent, familyIncome: undefined },
    expectedStatus: 'More information required',
  },
  {
    description: 'Age is missing, all other rules are met',
    scheme: makeScheme(),
    member: { ...eligibleStudent, age: undefined },
    expectedStatus: 'More information required',
  },
  {
    description: 'Member lives in another state',
    scheme: makeScheme(),
    member: { ...eligibleStudent, state: 'Karnataka' },
    expectedStatus: 'Not matching current conditions',
  },
];
