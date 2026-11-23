// Scheme details: what the scheme is, who can apply, which family member matches, documents and how to apply.
// Matching uses the rule-based engine in lib/eligibility.js (no AI decides eligibility).
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CitizenLayout } from '../components/Layout.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useStore } from '../lib/store.jsx';
import { evaluateSchemeForMember, ELIGIBILITY_STATUS } from '../lib/eligibility.js';
import { addApplication } from '../services/applicationService.js';
import { SAMPLE_DATA_BANNER } from '../data/sampleData.js';

const NOT_VERIFIED = 'Not verified - confirm with the issuing authority';

// Show a date in a readable form. Missing dates show "Not verified".
function formatDate(iso) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return NOT_VERIFIED;
  return new Date(time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Turn the eligibility rules into plain sentences. Rules that are not set are skipped.
function eligibilitySentences(el = {}) {
  const sentences = [];
  const hasMin = el.ageMin !== null && el.ageMin !== undefined;
  const hasMax = el.ageMax !== null && el.ageMax !== undefined;
  if (hasMin && hasMax) sentences.push(`Age between ${el.ageMin} and ${el.ageMax} years.`);
  else if (hasMin) sentences.push(`Age ${el.ageMin} years or older.`);
  else if (hasMax) sentences.push(`Age ${el.ageMax} years or younger.`);
  if (el.incomeMax !== null && el.incomeMax !== undefined) {
    sentences.push(`Annual family income up to Rs. ${el.incomeMax}.`);
  }
  if (Array.isArray(el.occupations) && el.occupations.length) {
    sentences.push(`Occupation: ${el.occupations.join(', ')}.`);
  }
  if (Array.isArray(el.educations) && el.educations.length) {
    sentences.push(`Education: ${el.educations.join(', ')}.`);
  }
  if (el.state) sentences.push(`Living in ${el.state}.`);
  if (Array.isArray(el.districts) && el.districts.length) {
    sentences.push(`Living in one of these districts: ${el.districts.join(', ')}.`);
  }
  if (el.landholdingMaxAcres !== null && el.landholdingMaxAcres !== undefined) {
    sentences.push(`Land holding up to ${el.landholdingMaxAcres} acres.`);
  }
  if (el.gender) sentences.push(`Applicants must be ${String(el.gender).toLowerCase()}.`);
  return sentences;
}

export default function SchemeDetailsPage() {
  const { schemeId } = useParams();
  const navigate = useNavigate();
  const { state } = useStore();
  const phone = state.session.phone;
  const citizen = state.citizens[phone];
  const profile = citizen?.profile ?? null;
  const members = citizen?.familyMembers ?? [];
  const scheme = state.schemes.find((s) => s.id === schemeId) ?? null;
  const now = new Date();

  // The family member the application is made for. Defaults to the first member.
  const [applyMemberId, setApplyMemberId] = useState('');
  const selectedMemberId = members.some((m) => m.id === applyMemberId) ? applyMemberId : members[0]?.id ?? '';
  const applyMember = members.find((m) => m.id === selectedMemberId) ?? null;

  // Scheme not found: show a message and a way back.
  if (!scheme) {
    return (
      <CitizenLayout title="Scheme not found" helpSteps={['Go back to My Schemes and choose a scheme again.']}>
        <div className="card">
          <p>We could not find this scheme. It may have been removed.</p>
          <Link className="btn btn-primary" to="/citizen/matches">
            Back to My Schemes
          </Link>
        </div>
      </CitizenLayout>
    );
  }

  // Each family member's result for this scheme. The member's district falls back to the profile.
  const memberResults = members.map((m) => ({
    member: m,
    result: evaluateSchemeForMember(scheme, { ...m, district: m.district || profile?.district || null }, now),
  }));

  const applyResult = memberResults.find((r) => r.member.id === selectedMemberId)?.result ?? null;
  const applyBlocked = !applyMember || applyResult?.status === ELIGIBILITY_STATUS.CLOSED;

  // Create a "Not Started" application for the chosen member, then open the applications page.
  async function handleApply() {
    if (applyBlocked) return;
    await addApplication(phone, {
      schemeId: scheme.id,
      memberId: applyMember.id,
      status: 'Not Started',
      submittedAt: null,
      notes: '',
    });
    navigate('/citizen/applications');
  }

  // Send the citizen to the assistant with a question about this scheme already filled in.
  function askAssistant() {
    navigate('/citizen/assistant', { state: { prefill: `Tell me about ${scheme.name}` } });
  }

  const conditions = [...eligibilitySentences(scheme.eligibility), ...(scheme.additionalConditions ?? [])];
  const sentences = eligibilitySentences(scheme.eligibility);
  const benefits = scheme.benefits ?? [];
  const documents = scheme.documents ?? [];
  const steps = scheme.steps ?? [];

  return (
    <CitizenLayout
      title={scheme.name}
      helpSteps={[
        'Read what the scheme is and who can apply.',
        'Check which family member matches and why.',
        'Look at the document list before you apply.',
        'Press Apply Now to start an application, or ask the assistant a question.',
        'Always confirm details on the official portal before you rely on them.',
      ]}
    >
      {scheme.isDemo && <p className="notice notice-demo">DEMO: this scheme is sample data. {SAMPLE_DATA_BANNER}</p>}

      <div className="card">
        <p className="muted">{scheme.department}</p>
        <p>Application dates: {formatDate(scheme.startDate)} to {formatDate(scheme.endDate)}</p>

        <div className="row" style={{ marginTop: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="apply-member">Apply for</label>
            <select
              id="apply-member"
              className="select"
              value={selectedMemberId}
              onChange={(e) => setApplyMemberId(e.target.value)}
              disabled={members.length === 0}
            >
              {members.length === 0 && <option value="">No family members yet</option>}
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleApply} disabled={applyBlocked}>
            Apply Now
          </button>
          <button type="button" className="btn btn-secondary" onClick={askAssistant}>
            Ask the assistant about this scheme
          </button>
        </div>
        {members.length === 0 && (
          <p className="muted">
            <Link to="/citizen/family">Add a family member</Link> before you apply.
          </p>
        )}
        {applyResult?.status === ELIGIBILITY_STATUS.CLOSED && (
          <p className="error-text">This scheme is closed for the selected member, so you cannot apply now.</p>
        )}
      </div>

      <section className="card" aria-labelledby="what-heading">
        <h2 id="what-heading">What is this scheme?</h2>
        <p>{scheme.description}</p>
      </section>

      <section className="card" aria-labelledby="dept-heading">
        <h2 id="dept-heading">Which government department provides it?</h2>
        <p>Department: {scheme.department}</p>
        <p>Contact: {scheme.contact}</p>
      </section>

      <section className="card" aria-labelledby="who-heading">
        <h2 id="who-heading">Who can apply?</h2>
        {sentences.length ? <p>{sentences.join(' ')}</p> : <p>No specific rules are listed for this scheme.</p>}
      </section>

      <section className="card" aria-labelledby="member-heading">
        <h2 id="member-heading">Which family member matches?</h2>
        {memberResults.length === 0 && <p>Add family members to see who may match.</p>}
        {memberResults.map(({ member, result }) => (
          <div key={member.id} style={{ marginBottom: 12 }}>
            <h3 style={{ marginBottom: 4 }}>{member.name}</h3>
            <StatusBadge status={result.status} />
            <ul>
              {result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="card" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading">What benefits does the scheme provide?</h2>
        {benefits.length ? (
          <ul>
            {benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : (
          <p>{NOT_VERIFIED}</p>
        )}
      </section>

      <section className="card" aria-labelledby="conditions-heading">
        <h2 id="conditions-heading">What are the eligibility conditions?</h2>
        {conditions.length ? (
          <ul>
            {conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : (
          <p>No conditions are listed.</p>
        )}
      </section>

      <section className="card" aria-labelledby="docs-heading">
        <h2 id="docs-heading">What documents are required?</h2>
        {documents.length === 0 ? (
          <p>{NOT_VERIFIED}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Why needed</th>
                  <th>Issuing authority</th>
                  <th>Where to obtain</th>
                  <th>Official website</th>
                  <th>Procedure</th>
                  <th>Fee and processing time</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.name}>
                    <td>{doc.name}</td>
                    <td>{doc.whyNeeded || NOT_VERIFIED}</td>
                    <td>{doc.issuingAuthority || NOT_VERIFIED}</td>
                    <td>{doc.whereToObtain || NOT_VERIFIED}</td>
                    <td>
                      {doc.officialWebsite ? (
                        <a href={doc.officialWebsite} target="_blank" rel="noopener noreferrer">
                          {doc.officialWebsite}
                        </a>
                      ) : (
                        NOT_VERIFIED
                      )}
                    </td>
                    <td>{doc.procedure || NOT_VERIFIED}</td>
                    <td>
                      Fee: {doc.officialFee ?? NOT_VERIFIED}
                      <br />
                      Processing time: {doc.processingTime ?? NOT_VERIFIED}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="dates-heading">
        <h2 id="dates-heading">Application dates</h2>
        <p>Start date: {formatDate(scheme.startDate)}</p>
        <p>End date: {formatDate(scheme.endDate)}</p>
      </section>

      <section className="card" aria-labelledby="how-heading">
        <h2 id="how-heading">How to apply?</h2>
        {steps.length ? (
          <ol>
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : (
          <p>{NOT_VERIFIED}</p>
        )}
      </section>

      <section className="card" aria-labelledby="official-heading">
        <h2 id="official-heading">Official application link</h2>
        {scheme.officialLink ? (
          <p>
            <a href={scheme.officialLink} target="_blank" rel="noopener noreferrer">
              Check official portal
            </a>
          </p>
        ) : (
          <p>{NOT_VERIFIED}</p>
        )}
      </section>

      <section className="card" aria-labelledby="contact-heading">
        <h2 id="contact-heading">Contact details</h2>
        <p>{scheme.contact || NOT_VERIFIED}</p>
      </section>

      <section className="card" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Frequently asked questions</h2>
        <details>
          <summary>Is this an official government page?</summary>
          <p>No. This is a prototype with sample data. Check the official website before you act.</p>
        </details>
        <details>
          <summary>Does matching guarantee approval?</summary>
          <p>No. Matching shows possible eligibility only. The issuing authority decides approval.</p>
        </details>
        <details>
          <summary>Who should I contact?</summary>
          <p>Contact the department: {scheme.department}. Contact details: {scheme.contact}</p>
        </details>
      </section>
    </CitizenLayout>
  );
}
