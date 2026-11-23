// "Get my documents": guidance on the certificates and papers that schemes ask for,
// plus a checklist of what the citizen already has.
// All content is general guidance from sample data. It is not official advice.
import { useEffect, useState } from 'react';
import { CitizenLayout } from '../components/Layout.jsx';

const CHECKLIST_KEY = 'ss_doc_checklist';

const NOT_VERIFIED = 'Not verified - confirm with the issuing authority';

// Plain data. Fees and times are deliberately not invented.
const DOCUMENTS = [
  {
    name: 'Income certificate',
    what: 'A certificate that states your family\'s annual income.',
    why: 'Many scholarships and welfare schemes have an income limit and ask for proof.',
    issuingAuthority: 'Mandal Revenue Office (MRO) - verify locally',
    whereToApply: 'Mee Seva centre or the Mandal Revenue Office (MRO)',
    steps: [
      'Go to your nearest Mee Seva centre or check the official portal.',
      'Fill in the application with family and income details.',
      'Attach the required identity and address proof.',
      'Pay any fee if asked and keep the acknowledgement slip.',
    ],
    onlineApplication: 'Check the official portal',
    officeVisitMayBeNeeded: 'May be needed - confirm locally',
    fee: NOT_VERIFIED,
    processingTime: NOT_VERIFIED,
  },
  {
    name: 'Caste certificate',
    what: 'A certificate that shows your caste category (for example SC, ST, BC or EWS where applicable).',
    why: 'Reservation-based scholarships and schemes ask for it.',
    issuingAuthority: 'Mandal Revenue Office (MRO) - verify locally',
    whereToApply: 'Mee Seva centre or the Mandal Revenue Office (MRO)',
    steps: [
      'Check the current application process on the official portal.',
      'Fill in the form with your details and parents\' details.',
      'Attach school or birth records if asked.',
      'Keep the acknowledgement number for follow-up.',
    ],
    onlineApplication: 'Check the official portal',
    officeVisitMayBeNeeded: 'May be needed - confirm locally',
    fee: NOT_VERIFIED,
    processingTime: NOT_VERIFIED,
  },
  {
    name: 'Residence certificate',
    what: 'A certificate that confirms where you live in Telangana.',
    why: 'State schemes check that the applicant lives in the state or district.',
    issuingAuthority: 'Mandal Revenue Office (MRO) or Municipal office - verify locally',
    whereToApply: 'Mee Seva centre or local revenue office',
    steps: [
      'Collect an address proof such as a ration card or electricity bill.',
      'Apply through the official portal or at the Mee Seva centre.',
      'Keep the acknowledgement slip.',
    ],
    onlineApplication: 'Check the official portal',
    officeVisitMayBeNeeded: 'May be needed - confirm locally',
    fee: NOT_VERIFIED,
    processingTime: NOT_VERIFIED,
  },
  {
    name: 'Bonafide / student certificate',
    what: 'A letter from your school or college confirming that you are currently enrolled.',
    why: 'Scholarships and laptop or hostel schemes need proof that you are studying now.',
    issuingAuthority: 'Principal or head of your school or college - verify locally',
    whereToApply: 'Your school or college office',
    steps: [
      'Ask the office for a bonafide or student certificate.',
      'Give your admission number and course details.',
      'Check that the certificate has the institution seal and signature.',
    ],
    onlineApplication: 'Usually not online - ask your institution',
    officeVisitMayBeNeeded: 'Yes, usually',
    fee: NOT_VERIFIED,
    processingTime: NOT_VERIFIED,
  },
  {
    name: 'Bank account proof',
    what: 'Proof that a bank account is in your name. Usually a passbook first page or a letter from the bank.',
    why: 'Scholarship money is paid into a bank account, so schemes ask for it.',
    issuingAuthority: 'Your bank branch - verify locally',
    whereToApply: 'Your bank branch. Ask the bank which document it gives.',
    steps: [
      'Ask your bank branch for a passbook copy or an account letter.',
      'Check that your name, account number and branch are printed clearly.',
      'Ask the bank which documents it accepts for scheme payments.',
    ],
    onlineApplication: 'Check your bank\'s own app or website',
    officeVisitMayBeNeeded: 'Often yes - confirm with your bank',
    fee: NOT_VERIFIED,
    processingTime: NOT_VERIFIED,
    note: 'This page only explains the document. Never share your Aadhaar number on an unofficial website or with someone who calls you.',
  },
  {
    name: 'Ration card',
    what: 'A household card used for food supplies and as family and address proof.',
    why: 'Often used to show family members and to confirm the household.',
    issuingAuthority: 'Civil Supplies Department (Mandal office) - verify locally',
    whereToApply: 'Mee Seva centre or the Mandal civil supplies office',
    steps: [
      'Check the official portal for the current ration card process.',
      'Fill in the form with the family members\' details.',
      'Attach address proof and keep the acknowledgement.',
    ],
    onlineApplication: 'Check the official portal',
    officeVisitMayBeNeeded: 'May be needed - confirm locally',
    fee: NOT_VERIFIED,
    processingTime: NOT_VERIFIED,
  },
  {
    name: 'Marks memo',
    what: 'The marksheet from your last exam, such as 10th or Intermediate.',
    why: 'Most student schemes check your previous marks or the class you passed.',
    issuingAuthority: 'Board of Secondary or Intermediate Education - verify locally',
    whereToApply: 'Your school or college, or the board\'s official website',
    steps: [
      'Check whether your school can give you a copy.',
      'If not, check the board\'s official website for a copy or duplicate.',
      'Keep a self-attested photocopy for applications.',
    ],
    onlineApplication: 'Check the official portal',
    officeVisitMayBeNeeded: 'Sometimes - confirm with your school',
    fee: NOT_VERIFIED,
    processingTime: NOT_VERIFIED,
  },
  {
    name: 'Disability certificate',
    what: 'A certificate that states the type and percentage of disability.',
    why: 'Disability-related schemes and reservations need an official certificate.',
    issuingAuthority: 'District medical board or designated hospital - verify locally',
    whereToApply: 'Government hospital or district medical board',
    steps: [
      'Check the official portal for the current assessment process.',
      'Book an assessment at the designated hospital if required.',
      'Bring past medical records and photographs as asked.',
      'Keep the certificate safe and make copies.',
    ],
    onlineApplication: 'Check the official portal',
    officeVisitMayBeNeeded: 'Yes, an assessment is usually needed',
    fee: NOT_VERIFIED,
    processingTime: NOT_VERIFIED,
  },
  {
    name: 'Land records (pattadar passbook)',
    what: 'The pattadar passbook and title book that show land ownership.',
    why: 'Farmer schemes check land ownership and the size of the holding.',
    issuingAuthority: 'Mandal Revenue Office (MRO) - verify locally',
    whereToApply: 'Mandal Revenue Office or the official land records portal',
    steps: [
      'Check the official land records portal for your survey number.',
      'Visit the MRO office if you need a certified copy.',
      'Keep the passbook and a photocopy safe.',
    ],
    onlineApplication: 'Check the official portal',
    officeVisitMayBeNeeded: 'May be needed - confirm locally',
    fee: NOT_VERIFIED,
    processingTime: NOT_VERIFIED,
  },
];

const OFFICIAL_LINKS = [
  { href: 'https://telangana.gov.in', label: 'Telangana state government portal' },
  { href: 'https://www.myscheme.gov.in', label: 'myScheme portal' },
];

function loadChecklist() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function DocumentsPage() {
  const [selectedName, setSelectedName] = useState(DOCUMENTS[0].name);
  // Checklist keyed by document name. Kept in localStorage for now.
  // TODO: move to the backend (per-citizen checklist) when the API exists.
  const [checklist, setChecklist] = useState(loadChecklist);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklist));
    } catch {
      // Storage blocked: the checklist works for this visit only.
    }
  }, [checklist]);

  const doc = DOCUMENTS.find((d) => d.name === selectedName) ?? DOCUMENTS[0];

  function toggle(name) {
    setChecklist((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function clearChecklist() {
    setChecklist({});
  }

  const haveCount = DOCUMENTS.filter((d) => checklist[d.name]).length;

  const helpSteps = [
    'Choose a document from the list to see what it is and where to get it.',
    'Read the steps. Fees and times are not verified here, so confirm with the issuing office.',
    'Tick the documents you already have in the checklist. Your ticks are saved on this device.',
    'Use the official portal links to check the latest process before you apply.',
  ];

  return (
    <CitizenLayout title="Get my documents" helpSteps={helpSteps}>
      <div className="container">
        <p className="notice notice-demo">
          General guidance from sample data, not official advice.
        </p>

        <section className="card" aria-labelledby="doc-guide-title">
          <h2 id="doc-guide-title">Document guide</h2>

          <div className="form-group">
            <label htmlFor="doc-select">Choose a document</label>
            <select
              id="doc-select"
              className="select"
              value={doc.name}
              onChange={(e) => setSelectedName(e.target.value)}
            >
              {DOCUMENTS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <h3>{doc.name}</h3>
          <dl>
            <dt>What it is</dt>
            <dd>{doc.what}</dd>

            <dt>Why it is needed</dt>
            <dd>{doc.why}</dd>

            <dt>Issuing authority</dt>
            <dd>{doc.issuingAuthority}</dd>

            <dt>Where to apply</dt>
            <dd>{doc.whereToApply}</dd>

            <dt>Online application</dt>
            <dd>{doc.onlineApplication}</dd>

            <dt>Office visit</dt>
            <dd>{doc.officeVisitMayBeNeeded}</dd>

            <dt>Fee</dt>
            <dd>{doc.fee}</dd>

            <dt>Processing time</dt>
            <dd>{doc.processingTime}</dd>
          </dl>

          <h4>Steps</h4>
          <ol>
            {doc.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {doc.note && <p className="notice">{doc.note}</p>}
        </section>

        <section className="card" aria-labelledby="doc-check-title">
          <h2 id="doc-check-title">My document checklist</h2>
          <p>
            Tick the documents you already have. {haveCount} of {DOCUMENTS.length} ticked.
          </p>

          {DOCUMENTS.map((d) => {
            const inputId = `doc-check-${d.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
            return (
              <div key={d.name} className="form-group">
                <label htmlFor={inputId} className="row" style={{ gap: 8 }}>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={Boolean(checklist[d.name])}
                    onChange={() => toggle(d.name)}
                  />
                  {d.name}
                </label>
              </div>
            );
          })}

          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={clearChecklist}>
              Clear checklist
            </button>
          </div>
        </section>

        <section className="card" aria-labelledby="doc-links-title">
          <h2 id="doc-links-title">Official portals</h2>
          <ul>
            {OFFICIAL_LINKS.map((link) => (
              <li key={link.href}>
                {link.label}{' '}
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  Check official portal
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </CitizenLayout>
  );
}
