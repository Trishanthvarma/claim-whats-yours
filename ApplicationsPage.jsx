// My Applications: the citizen's scheme applications for each family member.
// The citizen can set the status, reference number, submission date, notes and document checklist.
// The official verified flag is shown read-only. This page never sets it.
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { CitizenLayout } from '../components/Layout.jsx';
import { VerifiedBadge } from '../components/StatusBadge.jsx';
import { useStore } from '../lib/store.jsx';
import { listApplications, updateApplication } from '../services/applicationService.js';

// The statuses in the order they appear in the filter list.
const STATUSES = [
  'Not Started',
  'Documents Pending',
  'Ready to Apply',
  'Submitted',
  'Awaiting Response',
  'Approved',
  'Rejected',
  'Closed',
];

// Today's date as YYYY-MM-DD in the user's local time zone.
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Return a new history list with one entry added at the end.
function withHistory(record, text) {
  return [...(record.history || []), { at: new Date().toISOString(), text }];
}

// One application card. It keeps its own draft values for the text fields.
function ApplicationCard({ record, scheme, memberName, onChanged }) {
  const uid = useId();
  const phone = record.phone;
  const schemeName = scheme?.name || record.schemeId;

  // Draft values for the inputs. They start from the saved record.
  const [reference, setReference] = useState(record.referenceNumber || '');
  const [submittedDate, setSubmittedDate] = useState(record.submittedAt || '');
  const [notes, setNotes] = useState(record.notes || '');

  // Document names from the scheme. Accept plain strings too, just in case.
  const documentNames = Array.isArray(scheme?.documents)
    ? scheme.documents.map((d) => (typeof d === 'string' ? d : d?.name)).filter(Boolean)
    : [];
  const checklist = record.checklist || {};
  const history = Array.isArray(record.history) ? record.history : [];
  const newestFirst = [...history].reverse();

  // Save a patch through the service, then tell the page to reload.
  async function save(patch, historyText) {
    const fullPatch = historyText ? { ...patch, history: withHistory(record, historyText) } : patch;
    await updateApplication(phone, record.id, fullPatch);
    onChanged();
  }

  // Status change. A first-time "Submitted" also fills in today's date.
  async function handleStatusChange(value) {
    const patch = { status: value };
    if (value === 'Submitted' && !record.submittedAt) {
      patch.submittedAt = todayString();
    }
    await save(patch, 'Status changed to ' + value);
  }

  async function handleSaveReference() {
    await save({ referenceNumber: reference.trim() }, 'Reference number saved');
  }

  async function handleSaveDate() {
    await save({ submittedAt: submittedDate || null }, 'Submission date saved');
  }

  async function handleSaveNotes() {
    await save({ notes }, 'Notes saved');
  }

  // Tick or untick one document. The whole checklist object is saved.
  async function handleChecklistChange(docName, checked) {
    const newChecklist = { ...checklist, [docName]: checked };
    await save({ checklist: newChecklist }, `Checklist updated: ${docName} ${checked ? 'ticked' : 'unticked'}`);
  }

  // Remove the record. There is no delete in the service, so it is marked removed and hidden.
  // This must move to the backend (a real delete) when the backend exists.
  async function handleRemove() {
    const ok = window.confirm('Remove this application record from this device?');
    if (!ok) return;
    await updateApplication(phone, record.id, { removed: true });
    onChanged();
  }

  return (
    <article className="card" aria-label={`Application for ${schemeName}`}>
      <h2 style={{ marginTop: 0 }}>{schemeName}</h2>
      <p>
        <strong>Family member:</strong> {memberName}
      </p>
      <p>
        <VerifiedBadge verified={record.officialVerified === true} />
      </p>

      <div className="form-group">
        <label htmlFor={`${uid}-status`}>Status</label>
        <select
          id={`${uid}-status`}
          className="select"
          aria-label={`Status for ${schemeName}`}
          value={record.status || 'Not Started'}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor={`${uid}-ref`}>Application reference number</label>
        <input
          id={`${uid}-ref`}
          className="input"
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={handleSaveReference}>
          Save reference
        </button>
      </div>

      <div className="form-group">
        <label htmlFor={`${uid}-date`}>Submission date</label>
        <input
          id={`${uid}-date`}
          className="input"
          type="date"
          value={submittedDate}
          onChange={(e) => setSubmittedDate(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={handleSaveDate}>
          Save date
        </button>
      </div>

      <div className="form-group">
        <label htmlFor={`${uid}-notes`}>Your notes</label>
        <textarea
          id={`${uid}-notes`}
          className="textarea"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={handleSaveNotes}>
          Save notes
        </button>
      </div>

      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
        <legend>Document checklist</legend>
        {documentNames.length === 0 && <p className="muted">This scheme lists no documents.</p>}
        {documentNames.map((docName) => {
          const checkId = `${uid}-doc-${docName.replace(/[^a-zA-Z0-9]/g, '-')}`;
          return (
            <div key={docName} className="form-group">
              <input
                id={checkId}
                type="checkbox"
                checked={checklist[docName] === true}
                onChange={(e) => handleChecklistChange(docName, e.target.checked)}
              />{' '}
              <label htmlFor={checkId}>{docName}</label>
            </div>
          );
        })}
      </fieldset>

      <div>
        <h3>Activity history</h3>
        {newestFirst.length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : (
          <ul>
            {newestFirst.map((entry, i) => (
              <li key={`${entry.at}-${i}`}>
                {new Date(entry.at).toLocaleString()}: {entry.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-danger" onClick={handleRemove}>
          Remove
        </button>
      </div>
    </article>
  );
}

export default function ApplicationsPage() {
  const { state } = useStore();
  const phone = state.session.phone;

  // Schemes can be an array or an object. Turn either into a list.
  const schemes = Array.isArray(state.schemes) ? state.schemes : Object.values(state.schemes || {});
  const members = state.citizens[phone]?.familyMembers ?? [];

  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState('all');
  // Bumping this number reloads the records.
  const [reloadCount, setReloadCount] = useState(0);

  // Load the records when the page opens or the phone changes, and after each update.
  useEffect(() => {
    let active = true;
    if (!phone) {
      setRecords([]);
      return undefined;
    }
    listApplications(phone).then((list) => {
      if (active) setRecords(Array.isArray(list) ? list : []);
    });
    return () => {
      active = false;
    };
  }, [phone, reloadCount]);

  function reload() {
    setReloadCount((n) => n + 1);
  }

  // Hide records that were removed, then apply the status filter.
  const visible = records
    .filter((r) => r.removed !== true)
    .filter((r) => filter === 'all' || (r.status || 'Not Started') === filter);

  // Look up the scheme name and the family member name, with fallbacks.
  function schemeFor(record) {
    return schemes.find((s) => s.id === record.schemeId);
  }
  function memberNameFor(record) {
    const member = members.find((m) => m.id === record.memberId);
    return member?.name || 'Family member';
  }

  const hasRecords = records.some((r) => r.removed !== true);

  return (
    <CitizenLayout
      title="My applications"
      helpSteps={[
        'This page lists the scheme applications you are tracking for your family.',
        'Use the Filter box to show only applications with one status.',
        'Change the Status box when your application moves to a new stage.',
        'Type a reference number or submission date, then press the Save button next to it.',
        'Tick the documents you have ready. Use Notes to write your own reminders.',
        'Only official sources can confirm approval or rejection. Your own updates are self-reported.',
      ]}
    >
      <div className="container">
        <p className="notice">
          Only authorised government sources can confirm approval or rejection. Your own updates are self-reported.
        </p>

        {!hasRecords ? (
          <div className="card">
            <p>You have no applications yet.</p>
            <Link to="/citizen/matches" className="btn btn-primary">
              Find schemes for my family
            </Link>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="filter-status">Filter by status</label>
              <select
                id="filter-status"
                className="select"
                aria-label="Filter by status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {visible.length === 0 ? (
              <p className="muted">No applications match this status.</p>
            ) : (
              <div className="grid">
                {visible.map((record) => (
                  <ApplicationCard
                    key={record.id}
                    record={record}
                    scheme={schemeFor(record)}
                    memberName={memberNameFor(record)}
                    onChanged={reload}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </CitizenLayout>
  );
}
