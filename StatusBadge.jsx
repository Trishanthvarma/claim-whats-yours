// Small badges for eligibility status, application status, and whether data is official.
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { statusLabel } from '../lib/eligibility.js';

// Which badge colour each status gets. Unknown statuses show a plain grey badge.
const VARIANTS = {
  'Likely eligible': 'badge-success',
  Approved: 'badge-success',
  'More information required': 'badge-warning',
  'Documents Pending': 'badge-warning',
  'Not matching current conditions': 'badge-danger',
  Rejected: 'badge-danger',
  'Scheme closed': 'badge-muted',
  Closed: 'badge-muted',
  'Awaiting official verification': 'badge-info',
  Submitted: 'badge-info',
  'Awaiting Response': 'badge-info',
};

export function StatusBadge({ status }) {
  const { lang } = useLanguage();
  const variant = VARIANTS[status] || '';
  return <span className={`badge ${variant}`.trim()}>{statusLabel(status, lang)}</span>;
}

// Shows whether a value came from an official source or was typed in by the user.
export function VerifiedBadge({ verified }) {
  if (verified) {
    return <span className="badge badge-success">Official - verified</span>;
  }
  return <span className="badge badge-muted">Self-reported by you</span>;
}
