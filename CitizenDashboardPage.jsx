// Citizen dashboard: welcome, profile completeness, family count, quick links and upcoming deadlines.
// Matching uses the rule-based engine in lib/eligibility.js (no AI).
import { Link } from 'react-router-dom';
import { CitizenLayout } from '../components/Layout.jsx';
import { Icon } from '../components/Icon.jsx';
import { useStore } from '../lib/store.jsx';
import { LANGUAGE_OPTIONS } from '../i18n/LanguageContext.jsx';
import { evaluateAllForMember, ELIGIBILITY_STATUS } from '../lib/eligibility.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const QUICK_ACTIONS = [
  { to: '/citizen/family', icon: 'family', title: 'My Family', text: 'Add and check family members.' },
  { to: '/citizen/matches', icon: 'scheme', title: 'My Schemes', text: 'See schemes that may fit your family.' },
  { to: '/citizen/assistant', icon: 'mic', title: 'Ask the Assistant', text: 'Ask a question by voice or text.' },
  { to: '/citizen/documents', icon: 'document', title: 'Get My Documents', text: 'See which documents each scheme needs.' },
  { to: '/citizen/applications', icon: 'list', title: 'My Applications', text: 'Track the schemes you have started.' },
  { to: '/citizen/notifications', icon: 'bell', title: 'Notifications', text: 'Deadline reminders and messages.' },
];

export default function CitizenDashboardPage() {
  const { state } = useStore();
  const phone = state.session.phone;
  const citizen = state.citizens[phone];
  const profile = citizen?.profile ?? null;
  const members = citizen?.familyMembers ?? [];
  const schemes = state.schemes;
  const now = new Date();

  // Profile checks. Email is optional, so it is shown but not counted in the percentage.
  const checks = [
    { label: 'Full name', done: Boolean(profile?.fullName) },
    { label: 'District', done: Boolean(profile?.district) },
    { label: 'Preferred language', done: Boolean(profile?.language) },
    { label: 'At least one family member', done: members.length > 0 },
    { label: 'Consent given', done: Boolean(profile?.consentGiven) },
  ];
  const doneCount = checks.filter((c) => c.done).length;
  const percent = Math.round((doneCount / checks.length) * 100);

  // Each member gets the profile district if the member has none of their own.
  const memberContexts = members.map((m) => ({ ...m, district: m.district || profile?.district || null }));

  // Count the (member, scheme) pairs that are likely or need more information.
  let likelyCount = 0;
  let moreInfoCount = 0;
  for (const member of memberContexts) {
    for (const result of evaluateAllForMember(schemes, member, now)) {
      if (result.status === ELIGIBILITY_STATUS.LIKELY) likelyCount += 1;
      if (result.status === ELIGIBILITY_STATUS.MORE_INFO) moreInfoCount += 1;
    }
  }

  // Published schemes that have not ended yet, soonest first.
  const upcoming = schemes
    .filter((s) => s.status === 'published' && !s.archived)
    .map((s) => ({ scheme: s, end: Date.parse(s.endDate) }))
    .filter((x) => !Number.isNaN(x.end) && x.end > now.getTime())
    .sort((a, b) => a.end - b.end);

  const languageLabel = LANGUAGE_OPTIONS.find((o) => o.code === profile?.language)?.label ?? 'Not set';
  const hasDemoData = Boolean(profile?.isDemo) || members.some((m) => m.isDemo) || schemes.some((s) => s.isDemo);

  return (
    <CitizenLayout
      title="Dashboard"
      helpSteps={[
        'Your profile percentage shows what is still missing.',
        'Use the quick links to add family members, check schemes or ask the assistant.',
        'The deadlines list shows open schemes, soonest first.',
        'Everything shown is sample data for the prototype.',
      ]}
    >
      {hasDemoData && (
        <p className="notice notice-demo">
          Demo data: the names, family details, schemes and dates on this page are sample data for demonstration.
        </p>
      )}

      <div className="card">
        <h2>Welcome, {profile?.fullName || 'citizen'}</h2>
        <p className="muted">Preferred language: {languageLabel}</p>
        <p>Family members: <strong>{members.length}</strong></p>
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="completeness-heading">
          <h2 id="completeness-heading">Profile completeness: {percent}%</h2>
          <ul style={{ paddingLeft: 20 }}>
            {checks.map((c) => (
              <li key={c.label}>
                {c.done ? 'Done' : 'Missing'}: {c.label}
              </li>
            ))}
          </ul>
          <p className="muted">
            Email is optional: {profile?.email ? 'added.' : 'not added (optional, not counted).'}
          </p>
          {percent < 100 && (
            <Link className="btn btn-secondary" to="/citizen/profile-setup">
              Complete profile
            </Link>
          )}
        </section>

        <section className="card" aria-labelledby="matches-summary-heading">
          <h2 id="matches-summary-heading">Scheme matches</h2>
          <p>
            Likely eligible: <strong>{likelyCount}</strong>
          </p>
          <p>
            More information required: <strong>{moreInfoCount}</strong>
          </p>
          <p className="muted">Counted across all family members. Matching is possible eligibility only, not approval.</p>
          <Link className="btn btn-secondary" to="/citizen/matches">
            See my schemes
          </Link>
        </section>
      </div>

      <h2>Quick actions</h2>
      <div className="grid-3">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.to} className="tile" to={action.to}>
            <Icon name={action.icon} size={32} />
            <strong>{action.title}</strong>
            <span className="muted">{action.text}</span>
          </Link>
        ))}
      </div>

      <section className="card" aria-labelledby="deadlines-heading" style={{ marginTop: 16 }}>
        <h2 id="deadlines-heading">Upcoming deadlines</h2>
        {upcoming.length === 0 ? (
          <p>No open schemes have a deadline coming up.</p>
        ) : (
          <ul style={{ paddingLeft: 20 }}>
            {upcoming.map(({ scheme, end }) => {
              const daysLeft = Math.ceil((end - now.getTime()) / DAY_MS);
              return (
                <li key={scheme.id} style={{ marginBottom: 8 }}>
                  <Link to={`/citizen/schemes/${scheme.id}`}>{scheme.name}</Link>{' '}
                  <span className="muted">
                    - {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </CitizenLayout>
  );
}
