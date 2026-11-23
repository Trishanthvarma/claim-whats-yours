// Admin page 2: Registered Users. Shows citizen accounts. Income stays hidden until an officer reveals it,
// and every reveal is written to the access log.
import { useMemo, useState } from 'react';
import { AdminLayout } from '../components/Layout.jsx';
import { StatusBadge, VerifiedBadge } from '../components/StatusBadge.jsx';
import { useStore } from '../lib/store.jsx';
import { evaluateAllForMember, ELIGIBILITY_STATUS } from '../lib/eligibility.js';
import { LANGUAGE_OPTIONS } from '../i18n/LanguageContext.jsx';
import { TELANGANA_DISTRICTS } from '../data/sampleData.js';

// Show only the last four digits. Example: +91 ******2345
function maskPhone(phone) {
  if (!phone) return 'Not set';
  return `+91 ******${String(phone).slice(-4)}`;
}

function fmtDateTime(iso) {
  if (!iso) return 'Not recorded';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not recorded';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MATCH_STATUSES = [ELIGIBILITY_STATUS.LIKELY, ELIGIBILITY_STATUS.MORE_INFO];

// For one citizen, check every family member against every scheme.
// Returns one entry per member, with the schemes that match (Likely or More information required).
function matchesForAccount(citizen, schemes) {
  const district = citizen.profile?.district;
  return (citizen.familyMembers || []).map((member) => {
    const results = evaluateAllForMember(schemes, { ...member, district });
    return {
      member,
      matches: results.filter((r) => MATCH_STATUSES.includes(r.status)),
    };
  });
}

// Count applications by status, for example "1 Submitted, 2 Documents Pending".
function progressText(applications) {
  if (!applications.length) return 'No applications';
  const counts = {};
  for (const a of applications) counts[a.status] = (counts[a.status] || 0) + 1;
  return Object.entries(counts)
    .map(([status, n]) => `${n} ${status}`)
    .join(', ');
}

export default function AdminUsersPage() {
  const { state, actions } = useStore();
  const schemes = state.schemes;

  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('all');
  const [language, setLanguage] = useState('all');
  const [hasApps, setHasApps] = useState('all');
  const [openPhone, setOpenPhone] = useState(null);
  const [revealed, setRevealed] = useState(false);

  // Build one row per account. Recalculated when the store changes.
  const rows = useMemo(() => {
    return Object.values(state.citizens).map((citizen) => {
      const perMember = matchesForAccount(citizen, schemes);
      const matchedIds = new Set();
      perMember.forEach((pm) => pm.matches.forEach((m) => matchedIds.add(m.scheme.id)));
      return {
        citizen,
        phone: citizen.phone,
        name: citizen.profile?.fullName || 'Name not entered yet',
        email: citizen.profile?.email || 'Not entered',
        registered: citizen.profile?.registeredAt || citizen.registeredAt || null,
        language: citizen.profile?.language || 'en',
        district: citizen.profile?.district || 'Not set',
        familyCount: (citizen.familyMembers || []).length,
        matchedCount: matchedIds.size,
        applications: citizen.applications || [],
        perMember,
      };
    });
  }, [state.citizens, schemes]);

  const visible = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    if (q && ![row.name, row.email].some((v) => v.toLowerCase().includes(q)) && !row.phone.includes(q.replace(/\s/g, ''))) {
      return false;
    }
    if (district !== 'all' && row.district !== district) return false;
    if (language !== 'all' && row.language !== language) return false;
    if (hasApps === 'yes' && row.applications.length === 0) return false;
    if (hasApps === 'no' && row.applications.length > 0) return false;
    return true;
  });

  const open = openPhone ? rows.find((r) => r.phone === openPhone) : null;

  function openProfile(phone) {
    setRevealed(false);
    setOpenPhone(phone);
  }

  // Reveal the household income. Every reveal is logged.
  function revealIncome(phone) {
    actions.addAdminLog({ action: 'reveal_income', target: phone, at: new Date().toISOString() });
    setRevealed(true);
  }

  const accessLog = state.adminLog.slice(0, 20);
  const languageLabel = (code) => LANGUAGE_OPTIONS.find((o) => o.code === code)?.label || code;

  return (
    <AdminLayout
      title="Registered Users"
      helpSteps={[
        'This page lists citizen accounts. Phone numbers are masked; only the last four digits show.',
        'Use the search box and the filters to find accounts.',
        'Press View profile to see family members, matching schemes and applications.',
        'Family income is hidden. Press Reveal income only when you need it. Every reveal is logged at the bottom of this page.',
      ]}
    >
      <div className="notice notice-demo" role="note">
        DEMO DATA: these are sample accounts, not real people.
      </div>
      <div className="notice" role="note">
        Only authorised officers may access personal data. Every reveal is logged below.
      </div>

      <div className="card">
        <div className="grid grid-2">
          <div className="form-group">
            <label htmlFor="user-search">Search (name, email or phone digits)</label>
            <input id="user-search" className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="user-district">District</label>
            <select id="user-district" className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="all">All districts</option>
              {TELANGANA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="user-language">Preferred language</label>
            <select id="user-language" className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="all">All languages</option>
              {LANGUAGE_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="user-apps">Has applications</label>
            <select id="user-apps" className="select" value={hasApps} onChange={(e) => setHasApps(e.target.value)}>
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
        <p className="muted" style={{ margin: 0 }}>Showing {visible.length} of {rows.length} accounts.</p>
      </div>

      {visible.length === 0 ? (
        <div className="card"><p>No accounts match these filters.</p></div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Account holder</th>
                <th scope="col">Phone</th>
                <th scope="col">Email</th>
                <th scope="col">Registered</th>
                <th scope="col">Language</th>
                <th scope="col">Family members</th>
                <th scope="col">District</th>
                <th scope="col">Matching schemes</th>
                <th scope="col">Application progress</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.phone}>
                  <td>{row.name}</td>
                  <td>{maskPhone(row.phone)}</td>
                  <td>{row.email}</td>
                  <td>{fmtDateTime(row.registered)}</td>
                  <td>{languageLabel(row.language)}</td>
                  <td>{row.familyCount}</td>
                  <td>{row.district}</td>
                  <td>{row.matchedCount}</td>
                  <td>{progressText(row.applications)}</td>
                  <td>
                    <button type="button" className="btn btn-secondary" onClick={() => openProfile(row.phone)}>
                      View profile<span className="sr-only"> for {row.name}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="modal-backdrop" onClick={() => setOpenPhone(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
            style={{ maxWidth: 800 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpenPhone(null);
            }}
          >
            <h2 id="profile-title">Profile: {open.name}</h2>
            <dl className="grid grid-2" style={{ gap: '4px 16px' }}>
              <div><dt className="muted">Phone</dt><dd>{maskPhone(open.phone)}</dd></div>
              <div><dt className="muted">Email</dt><dd>{open.email}</dd></div>
              <div><dt className="muted">District</dt><dd>{open.district}</dd></div>
              <div><dt className="muted">Language</dt><dd>{languageLabel(open.language)}</dd></div>
              <div>
                <dt className="muted">Household income (yearly)</dt>
                <dd>
                  {revealed ? (
                    `INR ${Number(open.citizen.familyMembers[0]?.familyIncome ?? 0).toLocaleString('en-IN')}`
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={() => revealIncome(open.phone)}>
                      Reveal income (logged)
                    </button>
                  )}
                </dd>
              </div>
            </dl>

            <h3 style={{ marginTop: 16 }}>Family members</h3>
            {open.perMember.length === 0 && <p>No family members added yet.</p>}
            <div className="grid grid-2">
              {open.perMember.map(({ member, matches }) => (
                <div key={member.id} className="card" style={{ margin: 0 }}>
                  <strong>{member.name}</strong>
                  <p className="muted" style={{ margin: '4px 0' }}>
                    {member.relationship}, age {member.age ?? 'not entered'}
                  </p>
                  <p style={{ margin: 0 }}>Occupation: {member.occupation || 'Not entered'}</p>
                  <p style={{ margin: 0 }}>Education: {member.education || 'Not entered'}</p>
                  <p style={{ margin: 0 }}>District: {open.district}</p>
                  <p style={{ margin: '4px 0 0' }}>
                    {matches.length === 0
                      ? 'No matching schemes right now.'
                      : `${matches.length} scheme(s) may match.`}
                  </p>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 16 }}>Matching schemes</h3>
            {open.perMember.every((pm) => pm.matches.length === 0) && <p>None right now.</p>}
            <ul>
              {open.perMember.flatMap(({ member, matches }) =>
                matches.map((m) => (
                  <li key={`${member.id}-${m.scheme.id}`}>
                    {m.scheme.name} for {member.name} <StatusBadge status={m.status} />
                  </li>
                ))
              )}
            </ul>

            <h3 style={{ marginTop: 16 }}>Application records</h3>
            {open.applications.length === 0 && <p>No applications yet.</p>}
            {open.applications.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Scheme</th>
                      <th scope="col">Family member</th>
                      <th scope="col">Status</th>
                      <th scope="col">Notes</th>
                      <th scope="col">Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {open.applications.map((a) => (
                      <tr key={a.id}>
                        <td>{schemes.find((s) => s.id === a.schemeId)?.name || a.schemeId}</td>
                        <td>{open.citizen.familyMembers.find((m) => m.id === a.memberId)?.name || 'Not linked'}</td>
                        <td><StatusBadge status={a.status} /></td>
                        <td>{a.notes || '-'}</td>
                        <td><VerifiedBadge verified={a.officialVerified === true} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setOpenPhone(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <section className="card" aria-labelledby="access-log-title" style={{ marginTop: 24 }}>
        <h2 id="access-log-title">Admin access log (last 20 entries)</h2>
        {accessLog.length === 0 ? (
          <p>No entries yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Action</th>
                  <th scope="col">Target</th>
                </tr>
              </thead>
              <tbody>
                {accessLog.map((entry, i) => (
                  <tr key={`${entry.at}-${i}`}>
                    <td>{fmtDateTime(entry.at)}</td>
                    <td>{entry.action}</td>
                    <td>{entry.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
