// Admin page 4: Analytics. KPI tiles, a per-scheme table, two small SVG charts and a CSV export.
// Only officially verified outcomes count as "Approved" or "Rejected". Everything else is user-reported.
import { useMemo, useState } from 'react';
import { AdminLayout } from '../components/Layout.jsx';
import { useStore } from '../lib/store.jsx';
import { evaluateSchemeForMember, ELIGIBILITY_STATUS } from '../lib/eligibility.js';
import { STATUSES, TELANGANA_DISTRICTS } from '../data/sampleData.js';

// Applications in these statuses have not been sent to the department yet.
const NOT_SUBMITTED = ['Not Started', 'Documents Pending', 'Ready to Apply'];
const PENDING = ['Submitted', 'Awaiting Response'];
const MATCH_STATUSES = [ELIGIBILITY_STATUS.LIKELY, ELIGIBILITY_STATUS.MORE_INFO];

// Colours for the donut chart, one per application status.
const DONUT_COLOURS = ['#6b7280', '#f59e0b', '#0891b2', '#1d4ed8', '#7c3aed', '#15803d', '#b91c1c', '#374151'];

const CSV_HEADER = [
  'Scheme', 'Potentially eligible members', 'Viewed', 'Started', 'Submitted', 'Pending',
  'Verified approvals', 'Completion percent',
];

// Wrap a value for CSV: quotes around text and doubled quotes inside it.
function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

// Start and end of a yyyy-mm-dd date, in local time.
function startOfDay(text) {
  return new Date(`${text}T00:00:00`);
}
function endOfDay(text) {
  return new Date(`${text}T23:59:59.999`);
}

export default function AdminAnalyticsPage() {
  const { state } = useStore();
  const citizens = Object.values(state.citizens);
  const schemes = state.schemes.filter((s) => !s.archived);

  const [schemeFilter, setSchemeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Every application, with the district of the account it belongs to.
  const allApps = useMemo(
    () =>
      citizens.flatMap((c) =>
        (c.applications || []).map((a) => ({ ...a, district: c.profile?.district || 'Not set' }))
      ),
    [state.citizens] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Apply the filters. A date filter drops applications that have no submission date.
  const filtered = useMemo(() => {
    return allApps.filter((a) => {
      if (schemeFilter !== 'all' && a.schemeId !== schemeFilter) return false;
      if (districtFilter !== 'all' && a.district !== districtFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (fromDate || toDate) {
        if (!a.submittedAt) return false;
        const when = new Date(a.submittedAt);
        if (fromDate && when < startOfDay(fromDate)) return false;
        if (toDate && when > endOfDay(toDate)) return false;
      }
      return true;
    });
  }, [allApps, schemeFilter, districtFilter, statusFilter, fromDate, toDate]);

  // Potential matches: family members (in the chosen district) matched to published schemes.
  const potentialMatches = useMemo(() => {
    const today = new Date();
    let count = 0;
    for (const c of citizens) {
      if (districtFilter !== 'all' && c.profile?.district !== districtFilter) continue;
      for (const m of c.familyMembers || []) {
        for (const s of schemes) {
          if (s.status !== 'published') continue;
          if (schemeFilter !== 'all' && s.id !== schemeFilter) continue;
          const r = evaluateSchemeForMember(s, { ...m, district: c.profile?.district }, today);
          if (MATCH_STATUSES.includes(r.status)) count += 1;
        }
      }
    }
    return count;
  }, [citizens, schemes, schemeFilter, districtFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // KPI tiles.
  const kpi = {
    accounts: citizens.length,
    members: citizens.reduce((sum, c) => sum + (c.familyMembers || []).length, 0),
    published: schemes.filter((s) => s.status === 'published').length,
    potential: potentialMatches,
    submitted: filtered.filter((a) => !NOT_SUBMITTED.includes(a.status)).length,
    pending: filtered.filter((a) => PENDING.includes(a.status)).length,
    approvedVerified: filtered.filter((a) => a.status === 'Approved' && a.officialVerified === true).length,
    rejectedVerified: filtered.filter((a) => a.status === 'Rejected' && a.officialVerified === true).length,
    userReported: filtered.filter(
      (a) => (a.status === 'Approved' || a.status === 'Submitted') && a.officialVerified !== true
    ).length,
  };

  // One row per scheme (or only the chosen scheme).
  const tableRows = useMemo(() => {
    const today = new Date();
    const chosen = schemes.filter((s) => schemeFilter === 'all' || s.id === schemeFilter);
    return chosen.map((s) => {
      let potentiallyEligible = 0;
      for (const c of citizens) {
        if (districtFilter !== 'all' && c.profile?.district !== districtFilter) continue;
        for (const m of c.familyMembers || []) {
          const r = evaluateSchemeForMember(s, { ...m, district: c.profile?.district }, today);
          if (MATCH_STATUSES.includes(r.status)) potentiallyEligible += 1;
        }
      }
      const apps = filtered.filter((a) => a.schemeId === s.id);
      const started = apps.filter((a) => a.status !== 'Not Started').length;
      const submitted = apps.filter((a) => !NOT_SUBMITTED.includes(a.status)).length;
      const pending = apps.filter((a) => PENDING.includes(a.status)).length;
      const verifiedApprovals = apps.filter((a) => a.status === 'Approved' && a.officialVerified === true).length;
      return {
        id: s.id,
        name: s.name,
        potentiallyEligible,
        viewed: s.viewCount ?? 0,
        started,
        submitted,
        pending,
        verifiedApprovals,
        // Share of started applications that were submitted.
        completion: started ? Math.round((submitted / started) * 100) : 0,
      };
    });
  }, [schemes, citizens, filtered, schemeFilter, districtFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bar chart scale: the biggest bar fills the width.
  const barMax = Math.max(1, ...tableRows.map((r) => Math.max(r.submitted, r.pending)));

  // Donut: count per application status.
  const statusCounts = STATUSES.application.map((status) => ({
    status,
    count: filtered.filter((a) => a.status === status).length,
  }));
  const donutTotal = statusCounts.reduce((sum, s) => sum + s.count, 0);
  const DONUT_R = 40;
  const DONUT_LEN = 2 * Math.PI * DONUT_R;

  function exportCsv() {
    const lines = [CSV_HEADER.map(csvCell).join(',')];
    for (const r of tableRows) {
      lines.push(
        [r.name, r.potentiallyEligible, r.viewed, r.started, r.submitted, r.pending, r.verifiedApprovals, `${r.completion}%`]
          .map(csvCell)
          .join(',')
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schemesaathi-analytics.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout
      title="Analytics"
      helpSteps={[
        'The tiles at the top count accounts, schemes and applications. Only officially verified approvals and rejections are labelled as official.',
        'Use the filters to narrow the numbers by scheme, dates, district or application status.',
        'The table shows one row per scheme. Completion percent is submitted applications out of started applications.',
        'Export CSV downloads the table you can see.',
      ]}
    >
      <div className="notice notice-demo" role="note">SAMPLE DATA. These numbers come from demo accounts only.</div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <Kpi label="Total accounts" value={kpi.accounts} />
        <Kpi label="Total family members" value={kpi.members} />
        <Kpi label="Published schemes" value={kpi.published} />
        <Kpi label="Potential matches" value={kpi.potential} />
        <Kpi label="Applications submitted" value={kpi.submitted} />
        <Kpi label="Applications pending" value={kpi.pending} />
        <Kpi label="Approved (officially verified)" value={kpi.approvedVerified} />
        <Kpi label="Rejected (officially verified)" value={kpi.rejectedVerified} />
        <Kpi label="Completed (user-reported) - not official" value={kpi.userReported} />
      </div>

      <div className="card">
        <h2>Filters</h2>
        <div className="grid grid-2">
          <div className="form-group">
            <label htmlFor="an-scheme">Scheme</label>
            <select id="an-scheme" className="select" value={schemeFilter} onChange={(e) => setSchemeFilter(e.target.value)}>
              <option value="all">All schemes</option>
              {schemes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="an-district">District</label>
            <select id="an-district" className="select" value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}>
              <option value="all">All districts</option>
              {TELANGANA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="an-from">Submitted from</label>
            <input id="an-from" className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="an-to">Submitted to</label>
            <input id="an-to" className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="an-status">Application status</label>
            <select id="an-status" className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.application.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {(fromDate || toDate) && (
          <p className="muted">Date filter only includes applications that have a submission date.</p>
        )}
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Scheme</th>
              <th scope="col">Potentially eligible (members)</th>
              <th scope="col">Viewed</th>
              <th scope="col">Started</th>
              <th scope="col">Submitted</th>
              <th scope="col">Pending</th>
              <th scope="col">Verified approvals</th>
              <th scope="col">Completion %</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.potentiallyEligible}</td>
                <td>{r.viewed}</td>
                <td>{r.started}</td>
                <td>{r.submitted}</td>
                <td>{r.pending}</td>
                <td>{r.verifiedApprovals}</td>
                <td>{r.completion}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tableRows.length === 0 && <p>No schemes to show.</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={tableRows.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card" aria-labelledby="bar-title">
          <h2 id="bar-title">Submitted vs pending by scheme</h2>
          {tableRows.length === 0 ? (
            <p>No data.</p>
          ) : (
            <>
              <svg viewBox={`0 0 600 ${tableRows.length * 44 + 10}`} width="100%" role="img" aria-label="Bar chart of submitted and pending applications per scheme">
                {tableRows.map((r, i) => {
                  const y = i * 44 + 8;
                  const label = r.name.length > 34 ? `${r.name.slice(0, 33)}...` : r.name;
                  const submittedWidth = (r.submitted / barMax) * 330;
                  const pendingWidth = (r.pending / barMax) * 330;
                  return (
                    <g key={r.id}>
                      <text x="0" y={y + 12} fontSize="12" fill="#111827">{label}</text>
                      <rect x="200" y={y} width={Math.max(submittedWidth, 1)} height="16" fill="#1d4ed8" />
                      <text x={204 + submittedWidth} y={y + 12} fontSize="11" fill="#111827">{r.submitted}</text>
                      <rect x="200" y={y + 20} width={Math.max(pendingWidth, 1)} height="16" fill="#f59e0b" />
                      <text x={204 + pendingWidth} y={y + 32} fontSize="11" fill="#111827">{r.pending}</text>
                    </g>
                  );
                })}
              </svg>
              <p className="muted">
                <span style={{ color: '#1d4ed8' }}>■</span> Submitted &nbsp;
                <span style={{ color: '#f59e0b' }}>■</span> Pending
              </p>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="donut-title">
          <h2 id="donut-title">Applications by status</h2>
          {donutTotal === 0 ? (
            <p>No applications match these filters.</p>
          ) : (
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <svg viewBox="0 0 120 120" width="180" role="img" aria-label={`Donut chart of ${donutTotal} applications by status`}>
                <circle cx="60" cy="60" r={DONUT_R} fill="none" stroke="#e5e7eb" strokeWidth="20" />
                {(() => {
                  let acc = 0;
                  return statusCounts.map((s, i) => {
                    if (s.count === 0) return null;
                    const len = (s.count / donutTotal) * DONUT_LEN;
                    const seg = (
                      <circle
                        key={s.status}
                        cx="60"
                        cy="60"
                        r={DONUT_R}
                        fill="none"
                        stroke={DONUT_COLOURS[i]}
                        strokeWidth="20"
                        strokeDasharray={`${len} ${DONUT_LEN - len}`}
                        strokeDashoffset={-acc}
                        transform="rotate(-90 60 60)"
                      />
                    );
                    acc += len;
                    return seg;
                  });
                })()}
              </svg>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {statusCounts.map((s, i) => (
                  <li key={s.status}>
                    <span style={{ color: DONUT_COLOURS[i] }}>■</span> {s.status}: {s.count}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="tile" role="group" aria-label={label}>
      <span className="muted">{label}</span>
      <strong style={{ fontSize: '1.6rem' }}>{value}</strong>
    </div>
  );
}
