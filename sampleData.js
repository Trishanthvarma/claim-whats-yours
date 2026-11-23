// Sample data for the SchemeSaathi prototype.
// EVERYTHING here is fictional demo content. It is not official government information.
// Every scheme name is marked "DEMO" and "(sample)" so nobody mistakes it for a real scheme.

export const SAMPLE_DATA_BANNER =
  'SAMPLE DATA FOR DEMONSTRATION. Not official government information. Verify every scheme on the official website before relying on it.';

export const TELANGANA_DISTRICTS = [
  'Adilabad',
  'Bhadradri Kothagudem',
  'Hyderabad',
  'Jagtial',
  'Jangaon',
  'Jayashankar Bhupalpally',
  'Jogulamba Gadwal',
  'Kamareddy',
  'Karimnagar',
  'Khammam',
  'Kumuram Bheem Asifabad',
  'Mahabubabad',
  'Mahabubnagar',
  'Mancherial',
  'Medak',
  'Medchal-Malkajgiri',
  'Mulugu',
  'Nagarkurnool',
  'Nalgonda',
  'Narayanpet',
  'Nirmal',
  'Nizamabad',
  'Peddapalli',
  'Rajanna Sircilla',
  'Rangareddy',
  'Sangareddy',
  'Siddipet',
  'Suryapet',
  'Vikarabad',
  'Wanaparthy',
  'Warangal Rural',
  'Warangal Urban',
  'Yadadri Bhuvanagiri',
];

export const OCCUPATIONS = [
  'Student',
  'Farmer',
  'Homemaker',
  'Daily wage worker',
  'Self-employed',
  'Salaried employee',
  'Unemployed',
  'Retired',
];

export const EDUCATION_LEVELS = [
  'Illiterate',
  'Below 10th',
  '10th',
  'Intermediate/12th',
  'Diploma/ITI',
  'Graduate',
  'Post-graduate',
];

export const RELATIONSHIPS = [
  'Self',
  'Father',
  'Mother',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Spouse',
  'Other',
];

// Application statuses (what the citizen is doing) and eligibility statuses (what the rules say).
// Spelling must match exactly: these strings are used as keys in translations.
export const STATUSES = {
  application: [
    'Not Started',
    'Documents Pending',
    'Ready to Apply',
    'Submitted',
    'Awaiting Response',
    'Approved',
    'Rejected',
    'Closed',
  ],
  eligibility: [
    'Likely eligible',
    'More information required',
    'Not matching current conditions',
    'Scheme closed',
    'Awaiting official verification',
  ],
};

// Build the demo schemes. Dates are computed from "today" so the demo always shows
// 2 upcoming, 5 active and 2 expired schemes, no matter when it is opened.
export function buildSeedSchemes(today = new Date()) {
  const day = 24 * 60 * 60 * 1000;
  const iso = (offsetDays) => new Date(today.getTime() + offsetDays * day).toISOString();
  const now = iso(0);

  // Helper: one document entry. Fields we do not know are null, as the spec requires.
  const doc = (name, whyNeeded, issuingAuthority) => ({
    name,
    whyNeeded,
    issuingAuthority,
    whereToObtain: 'Mee Seva centre or the issuing office',
    officialWebsite: 'https://www.myscheme.gov.in',
    procedure: 'Apply at the office or online as shown on the official website.',
    officialFee: null,
    processingTime: null,
    onlineApplicationAvailable: null,
  });

  // Helper: shared fields for every demo scheme.
  const base = (n, fields) => ({
    id: `SCH-DEMO-00${n}`,
    department: 'DEMO Department of Education (sample)',
    contact: 'DEMO helpline: 000-000-0000 (sample, not a real number)',
    officialLink: 'https://www.myscheme.gov.in',
    dataSource: 'manual',
    lastUpdated: now,
    isDemo: true,
    additionalConditions: [],
    questions: [],
    ...fields,
  });

  return [
    base(1, {
      name: 'DEMO: Telangana Student Support Scholarship (sample)',
      department: 'DEMO Department of Education (sample)',
      level: 'state',
      category: 'Scholarship',
      description: 'Yearly cash support for students from low-income families who are studying in government or aided colleges.',
      benefits: ['Rs. 1,000 per month during the academic year (sample)', 'Covers part of hostel fees (sample)'],
      eligibility: {
        ageMin: 15, ageMax: 25, incomeMax: 200000, occupations: ['Student'],
        educations: ['10th', 'Intermediate/12th', 'Diploma/ITI', 'Graduate'],
        state: 'Telangana', districts: null, landholdingMaxAcres: null, gender: null,
      },
      additionalConditions: ['Must be a student of a government or aided institution', 'Attendance of at least 75 percent'],
      questions: ['Which college or school are you studying in?', 'Do you live in a hostel?'],
      documents: [
        doc('Income certificate (sample)', 'Shows the family income limit is met', 'Revenue Department (sample)'),
        doc('Previous marksheet (sample)', 'Shows the student is continuing studies', 'School or college (sample)'),
      ],
      steps: ['Collect documents', 'Fill the form at the official portal', 'Submit and note the receipt number'],
      startDate: iso(-30), endDate: iso(180), status: 'published',
      lastVerified: now, verificationStatus: 'verified',
    }),
    base(2, {
      name: 'DEMO: Low-Income Students Laptop Support (sample)',
      department: 'DEMO Department of Technical Education (sample)',
      level: 'state',
      category: 'Equipment',
      description: 'One-time support to buy a laptop for students who need it for online classes.',
      benefits: ['One-time grant towards a laptop (sample amount)'],
      eligibility: {
        ageMin: 16, ageMax: 24, incomeMax: 150000, occupations: ['Student'],
        educations: ['Intermediate/12th', 'Diploma/ITI', 'Graduate'],
        state: 'Telangana', districts: null, landholdingMaxAcres: null, gender: null,
      },
      documents: [doc('Bonafide certificate (sample)', 'Proves current enrolment', 'College principal (sample)')],
      steps: ['Get bonafide certificate', 'Apply online', 'Wait for verification'],
      startDate: iso(-10), endDate: iso(90), status: 'published',
      lastVerified: null, verificationStatus: 'awaiting',
    }),
    base(3, {
      name: 'DEMO: Farmer Family Input Support (sample)',
      department: 'DEMO Department of Agriculture (sample)',
      level: 'state',
      category: 'Agriculture',
      description: 'Seasonal support for small farming families to buy seeds and fertiliser.',
      benefits: ['Seasonal cash support per acre (sample rate)'],
      eligibility: {
        ageMin: 18, ageMax: 70, incomeMax: 120000, occupations: ['Farmer'],
        educations: null, state: 'Telangana', districts: null,
        landholdingMaxAcres: 5, gender: null,
      },
      documents: [
        doc('Land passbook (sample)', 'Proves land ownership', 'Revenue Department (sample)'),
        doc('Aadhaar card (sample)', 'Identity proof', 'UIDAI (sample)'),
      ],
      steps: ['Check land records', 'Apply at the village office', 'Keep the acknowledgement'],
      startDate: iso(-60), endDate: iso(120), status: 'published',
      lastVerified: now, verificationStatus: 'verified',
    }),
    base(4, {
      name: 'DEMO: Girl Child Education Support (sample)',
      department: 'DEMO Department of Women and Child Welfare (sample)',
      level: 'central',
      category: 'Education',
      description: 'Support for girls from low-income families to continue school after 10th class.',
      benefits: ['Yearly education grant (sample amount)', 'Uniform and book allowance (sample)'],
      eligibility: {
        ageMin: 14, ageMax: 20, incomeMax: 250000, occupations: ['Student'],
        educations: ['10th', 'Intermediate/12th'], state: 'Telangana',
        districts: null, landholdingMaxAcres: null, gender: 'Female',
      },
      documents: [doc('Birth certificate (sample)', 'Proves age', 'Municipality or Gram Panchayat (sample)')],
      steps: ['Collect documents', 'Apply through the school', 'School forwards the form'],
      startDate: iso(-20), endDate: iso(200), status: 'published',
      lastVerified: now, verificationStatus: 'verified',
    }),
    base(5, {
      name: 'DEMO: Hostel and Mess Support for Students (sample)',
      department: 'DEMO Department of Social Welfare (sample)',
      level: 'state',
      category: 'Hostel',
      description: 'Free hostel and mess support for students from poor families who must live away from home to study.',
      benefits: ['Free hostel seat (sample)', 'Monthly mess allowance (sample)'],
      eligibility: {
        ageMin: 15, ageMax: 24, incomeMax: 100000, occupations: ['Student'],
        educations: null, state: 'Telangana', districts: null,
        landholdingMaxAcres: null, gender: null,
      },
      documents: [
        doc('Income certificate (sample)', 'Shows income limit', 'Revenue Department (sample)'),
        doc('Admission letter (sample)', 'Shows admission to a course', 'Institution (sample)'),
      ],
      steps: ['Apply on the portal before the deadline', 'Upload documents', 'Wait for allotment'],
      startDate: iso(-15), endDate: iso(60), status: 'published',
      lastVerified: null, verificationStatus: 'awaiting',
    }),
    base(6, {
      name: 'DEMO: Skill Training Stipend (sample)',
      department: 'DEMO Department of Skill Development (sample)',
      level: 'central',
      category: 'Skill training',
      description: 'Monthly stipend for young people who join a free skill training course.',
      benefits: ['Monthly stipend during training (sample amount)', 'Certificate on completion (sample)'],
      eligibility: {
        ageMin: 18, ageMax: 29, incomeMax: 180000, occupations: ['Unemployed', 'Student', 'Daily wage worker'],
        educations: ['10th', 'Intermediate/12th', 'Diploma/ITI', 'Graduate'],
        state: 'Telangana', districts: null, landholdingMaxAcres: null, gender: null,
      },
      documents: [doc('Education certificate (sample)', 'Shows highest qualification', 'Board or university (sample)')],
      steps: ['Choose a course', 'Apply online', 'Attend the first class'],
      startDate: iso(15), endDate: iso(240), status: 'published',
      lastVerified: null, verificationStatus: 'awaiting',
    }),
    base(7, {
      name: 'DEMO: Bus Pass Concession for Students (sample)',
      department: 'DEMO Department of Transport (sample)',
      level: 'state',
      category: 'Transport',
      description: 'Discount on bus passes for students who travel to school or college.',
      benefits: ['Bus pass at a reduced rate (sample)'],
      eligibility: {
        ageMin: 10, ageMax: 22, incomeMax: 200000, occupations: ['Student'],
        educations: null, state: 'Telangana', districts: null,
        landholdingMaxAcres: null, gender: null,
      },
      documents: [doc('Student ID card (sample)', 'Proves student status', 'School or college (sample)')],
      steps: ['Get student ID', 'Visit the bus depot counter', 'Pay and collect the pass'],
      startDate: iso(-200), endDate: iso(-5), status: 'published',
      lastVerified: now, verificationStatus: 'verified',
    }),
    base(8, {
      name: 'DEMO: Health Insurance Card Support (sample)',
      department: 'DEMO Department of Health (sample)',
      level: 'central',
      category: 'Health',
      description: 'Free health cover for families with low income. Works at empanelled hospitals.',
      benefits: ['Cover for hospital treatment up to a yearly limit (sample)'],
      eligibility: {
        ageMin: null, ageMax: null, incomeMax: 150000, occupations: null,
        educations: null, state: 'Telangana', districts: null,
        landholdingMaxAcres: null, gender: null,
      },
      documents: [doc('Ration card (sample)', 'Shows family members', 'Civil Supplies Department (sample)')],
      steps: ['Check eligibility', 'Visit a health camp or Mee Seva centre', 'Collect the card'],
      startDate: iso(-100), endDate: iso(-2), status: 'closed',
      lastVerified: null, verificationStatus: 'awaiting',
    }),
    base(9, {
      name: 'DEMO: Post-Matric Books Support (sample)',
      department: 'DEMO Department of Minorities Welfare (sample)',
      level: 'central',
      category: 'Books',
      description: 'Yearly allowance to buy books for students who are studying after 10th class.',
      benefits: ['Yearly book allowance (sample amount)'],
      eligibility: {
        ageMin: 15, ageMax: 26, incomeMax: 120000, occupations: ['Student'],
        educations: ['Intermediate/12th', 'Diploma/ITI', 'Graduate'],
        state: 'Telangana', districts: null, landholdingMaxAcres: null, gender: null,
      },
      documents: [doc('Previous year marksheet (sample)', 'Proves the student passed the last class', 'School or college (sample)')],
      steps: ['Collect documents', 'Apply through the college', 'Allowance is paid to the bank account'],
      startDate: iso(-400), endDate: iso(-30), status: 'published',
      lastVerified: now, verificationStatus: 'verified',
    }),
  ];
}

// Two DEMO citizen accounts. Each family member has a familyIncome (household income)
// and state. The district is kept on the profile and merged in when checking eligibility.
export const SEED_CITIZENS = [
  {
    phone: '+919000012345',
    profile: {
      fullName: 'Ramesh Kumar (DEMO)',
      phone: '+919000012345',
      district: 'Warangal Rural',
      language: 'te',
      state: 'Telangana',
      isDemo: true,
    },
    familyMembers: [
      {
        id: 'MEM-DEMO-R1', name: 'Ramesh Kumar', relationship: 'Father', age: 46, gender: 'Male',
        occupation: 'Farmer', education: '10th', landholdingAcres: 2.5, familyIncome: 90000,
        state: 'Telangana', isDemo: true,
      },
      {
        id: 'MEM-DEMO-R2', name: 'Lakshmi Kumar', relationship: 'Mother', age: 40, gender: 'Female',
        occupation: 'Homemaker', education: 'Below 10th', landholdingAcres: 0, familyIncome: 90000,
        state: 'Telangana', isDemo: true,
      },
      {
        id: 'MEM-DEMO-R3', name: 'Suresh Kumar', relationship: 'Son', age: 19, gender: 'Male',
        occupation: 'Student', education: 'Intermediate/12th', landholdingAcres: 0, familyIncome: 90000,
        state: 'Telangana', isDemo: true,
      },
      {
        id: 'MEM-DEMO-R4', name: 'Anitha Kumar', relationship: 'Daughter', age: 15, gender: 'Female',
        occupation: 'Student', education: '10th', landholdingAcres: 0, familyIncome: 90000,
        state: 'Telangana', isDemo: true,
      },
    ],
  },
  {
    phone: '+919000054321',
    profile: {
      fullName: 'Sravani Reddy (DEMO)',
      phone: '+919000054321',
      district: 'Hyderabad',
      language: 'en',
      state: 'Telangana',
      isDemo: true,
    },
    familyMembers: [
      {
        id: 'MEM-DEMO-S1', name: 'Sravani Reddy', relationship: 'Self', age: 22, gender: 'Female',
        occupation: 'Student', education: 'Graduate', landholdingAcres: 0, familyIncome: 180000,
        state: 'Telangana', isDemo: true,
      },
      {
        id: 'MEM-DEMO-S2', name: 'Venkat Reddy', relationship: 'Father', age: 50, gender: 'Male',
        occupation: 'Daily wage worker', education: '10th', landholdingAcres: 0, familyIncome: 180000,
        state: 'Telangana', isDemo: true,
      },
      {
        id: 'MEM-DEMO-S3', name: 'Harsha Reddy', relationship: 'Brother', age: 17, gender: 'Male',
        occupation: 'Student', education: '10th', landholdingAcres: 0, familyIncome: 180000,
        state: 'Telangana', isDemo: true,
      },
    ],
  },
];

// A few demo applications. Each one is tied to a citizen phone and a demo scheme id.
export const SEED_APPLICATIONS = [
  {
    id: 'APP-DEMO-001', phone: '+919000012345', schemeId: 'SCH-DEMO-001', memberId: 'MEM-DEMO-R3',
    status: 'Documents Pending', submittedAt: null, notes: 'Income certificate not uploaded yet (sample).',
    officialVerified: false,
  },
  {
    id: 'APP-DEMO-002', phone: '+919000012345', schemeId: 'SCH-DEMO-003', memberId: 'MEM-DEMO-R1',
    status: 'Submitted', submittedAt: null, notes: 'Acknowledgement number kept (sample).',
    officialVerified: false,
  },
  {
    id: 'APP-DEMO-003', phone: '+919000054321', schemeId: 'SCH-DEMO-006', memberId: 'MEM-DEMO-S1',
    status: 'Ready to Apply', submittedAt: null, notes: '',
    officialVerified: false,
  },
];

// A few demo notifications. The key is used to avoid showing the same message twice.
export const SEED_NOTIFICATIONS = [
  {
    id: 'NOT-DEMO-001', phone: '+919000012345', key: 'deadline-SCH-DEMO-001',
    title: 'Deadline reminder (sample)', message: 'Telangana Student Support Scholarship closes in 180 days (sample).',
    schemeId: 'SCH-DEMO-001', read: false,
  },
  {
    id: 'NOT-DEMO-002', phone: '+919000054321', key: 'docs-SCH-DEMO-006',
    title: 'Documents needed (sample)', message: 'Add an education certificate to apply for Skill Training Stipend (sample).',
    schemeId: 'SCH-DEMO-006', read: false,
  },
];
