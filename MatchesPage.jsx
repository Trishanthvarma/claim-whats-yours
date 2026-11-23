// My Family Schemes: for each family member, the schemes that may fit them, grouped by status.
// Matching uses the rule-based engine in lib/eligibility.js. It is possible eligibility only, not approval.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CitizenLayout } from '../components/Layout.jsx';
import { Icon } from '../components/Icon.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useStore } from '../lib/store.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { evaluateAllForMember, statusLabel, ELIGIBILITY_STATUS } from '../lib/eligibility.js';
import { addApplication } from '../services/applicationService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Order of the status groups on the page (best news first).
const STATUS_ORDER = [
  ELIGIBILITY_STATUS.LIKELY,
  ELIGIBILITY_STATUS.MORE_INFO,
  ELIGIBILITY_STATUS.VERIFY,
  ELIGIBILITY_STATUS.NOT_MATCHING,
  ELIGIBILITY_STATUS.CLOSED,
];

// Text for how long is left before the end date.
function remainingText(scheme, now) {
  const end = Date.parse(scheme.endDate);
  if (Number.isNaN(end) || end < now.getTime()) return 'Closed';
  const days = Math.ceil((end - now.getTime()) / DAY_MS);
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

// Show a date in a readable form. Missing dates show "Not set".
function formatDate(iso) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return 'Not set';
  return new Date(time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MatchesPage() {
  const navigate = useNavigate();
  const { state } = useStore();
  const { lang } = useLanguage();
  const phone = state.session.phone;
  const citizen = state.citizens[phone];
  const profile = citizen?.profile ?? null;
  const members = citizen?.familyMembers ?? [];
  const schemes = state.schemes;
  const now = new Date();

  const [statusFilter, setStatusFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  // Which "Why?" panels are open. Key = member id + scheme id.
  const [openWhy, setOpenWhy] = useState({});

  function toggleWhy(key) {
    setOpenWhy((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Create a "Not Started" application for this member and scheme, then open the applications page.
  async function handleApply(scheme, member) {
    await addApplication(phone, {
      schemeId: scheme.id,
      memberId: member.id,
      status: 'Not Started',
      submittedAt: null,
      notes: '',
    });
    navigate('/citizen/applications');
  }

  // The member's district comes from the profile when the member has none of their own.
  const shownMembers = members.filter((m) => memberFilter === 'all' || m.id === memberFilter);

  return (
    <CitizenLayout
      title="My Family Schemes"
      helpSteps={[
        'Each section is one family member. The count shows schemes that may fit them.',
        'Use the filters to show one status or one member.',
        'Press Why? to see the reasons for each result.',
        'Press Apply to start an application. You can track it on My Applications.',
        'Matching is possible eligibility only. Confirm on the official portal.',
      ]}
    >
      <p className="notice">
        Matching shows possible eligibility from sample rules only. It does not guarantee approval. Confirm on the
        official portal.
      </p>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label htmlFor="status-filter">Filter by status</label>
          <select
            id="status-filter"
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s, lang)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="member-filter">Family member</label>
          <select
            id="member-filter"
            className="select"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
          >
            <option value="all">All members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {members.length === 0 && (
        <div className="card">
          <h2>No family members yet</h2>
          <p>Add family members first, then matching schemes will show here.</p>
          <Link className="btn btn-primary" to="/citizen/family">
            Add family members
          </Link>
        </div>
      )}

      {schemes.length === 0 && members.length > 0 && (
        <div className="card">
          <p>No schemes are available in the sample data yet.</p>
        </div>
      )}

      {shownMembers.map((member) => {
        const memberContext = { ...member, district: member.district || profile?.district || null };
        const results = evaluateAllForMember(schemes, memberContext, now);
        const matchCount = results.filter(
          (r) => r.status === ELIGIBILITY_STATUS.LIKELY || r.status === ELIGIBILITY_STATUS.MORE_INFO
        ).length;
        const visible = results.filter((r) => statusFilter === 'all' || r.status === statusFilter);

        return (
          <section key={member.id} className="card" aria-labelledby={`member-${member.id}`}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id={`member-${member.id}`} className="row" style={{ margin: 0 }}>
                <Icon name="user" size={24} />
                <span>
                  {member.name} <span className="muted">({member.relationship || 'Family member'})</span>
                </span>
              </h2>
              <span className="badge badge-info">{matchCount} matching {matchCount === 1 ? 'scheme' : 'schemes'}</span>
            </div>

            {visible.length === 0 && <p className="muted">No schemes to show for this filter.</p>}

            {STATUS_ORDER.map((status) => {
              const group = visible.filter((r) => r.status === status);
              if (group.length === 0) return null;
              return (
                <div key={status} style={{ marginTop: 12 }}>
                  <h3>
                    <StatusBadge status={status} />
                  </h3>
                  <div className="grid-2">
                    {group.map((result) => {
                      const { scheme } = result;
                      const whyKey = `${member.id}|${scheme.id}`;
                      const isOpen = Boolean(openWhy[whyKey]);
                      const documentNames = (scheme.documents ?? []).map((d) => d.name);
                      return (
                        <article key={scheme.id} className="card" style={{ marginBottom: 0 }}>
                          <h4 style={{ margin: '0 0 6px' }}>{scheme.name}</h4>
                          <p className="muted" style={{ margin: '0 0 6px' }}>{scheme.department}</p>
                          <p style={{ margin: '0 0 6px' }}>
                            Starts: {formatDate(scheme.startDate)} | Ends: {formatDate(scheme.endDate)} |{' '}
                            {remainingText(scheme, now)}
                          </p>
                          <p style={{ margin: '0 0 6px' }}>
                            Documents: {documentNames.length ? documentNames.join(', ') : 'None listed'}
                          </p>

                          <div className="row" style={{ marginBottom: 8 }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleApply(scheme, member)}
                              disabled={status === ELIGIBILITY_STATUS.CLOSED}
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              aria-expanded={isOpen}
                              onClick={() => toggleWhy(whyKey)}
                            >
                              Why?
                            </button>
                            <Link className="btn btn-ghost" to={`/citizen/schemes/${scheme.id}`}>
                              View details
                            </Link>
                          </div>

                          {isOpen && (
                            <ul>
                              {result.reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </CitizenLayout>
  );
}
