// Admin page 1: Existing Schemes. Lists every scheme with summary tiles, search, filters, sort and two views.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/Layout.jsx';
import { StatusBadge, VerifiedBadge } from '../components/StatusBadge.jsx';
import { useStore } from '../lib/store.jsx';
import { SAMPLE_DATA_BANNER } from '../data/sampleData.js';

// Formatting helpers. Missing values show "Not set" so nothing looks filled in when it is not.
function inr(value) {
  if (value === null || value === undefined || value === '') return 'Not set';
  return `INR ${Number(value).toLocaleString('en-IN')}`;
}

function fmtDate(iso) {
  if (!iso) return 'Not set';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not set';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return 'Not set';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not set';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_OPTIONS = ['published', 'draft', 'closed', 'paused'];

// Every field of one scheme, as a list of label/value rows. Used by the card view and the details dialog.
function SchemeFacts({ scheme }) {
  const e = scheme.eligibility || {};
  const docs = scheme.documents || [];
  const isOfficial = scheme.verificationStatus === 'verified';
  return (
    <dl className="grid grid-2" style={{ gap: '6px 16px', margin: 0 }}>
      <Fact label="Scheme ID" value={scheme.id} />
      <Fact label="Category" value={scheme.category || 'Not set'} />
      <Fact label="Department" value={scheme.department || 'Not set'} />
      <Fact label="Level" value={scheme.level || 'Not set'} />
      <Fact label="Description" value={scheme.description || 'Not set'} wide />
      <Fact label="Eligible beneficiaries" value={scheme.targetBeneficiaries || 'Not entered'} wide />
      <Fact label="Age range" value={`${e.ageMin ?? 'Any'} to ${e.ageMax ?? 'Any'} years`} />
      <Fact label="Income limit (yearly)" value={inr(e.incomeMax)} />
      <Fact label="Education" value={Array.isArray(e.educations) && e.educations.length ? e.educations.join(', ') : 'Any'} />
      <Fact label="Occupation" value={Array.isArray(e.occupations) && e.occupations.length ? e.occupations.join(', ') : 'Any'} />
      <Fact label="State" value={e.state || 'Any'} />
      <Fact label="Districts" value={Array.isArray(e.districts) && e.districts.length ? e.districts.join(', ') : 'All districts'} wide />
      <Fact label="Required documents" value={docs.length ? docs.map((d) => d.name).join(', ') : 'None listed'} wide />
      <Fact label="Start date" value={fmtDateTime(scheme.startDate)} />
      <Fact label="End date" value={fmtDateTime(scheme.endDate)} />
      <Fact
        label="Official website"
        value={
          scheme.officialLink ? (
            <a href={scheme.officialLink} target="_blank" rel="noopener noreferrer">
              Check official portal
            </a>
          ) : (
            'Not set'
          )
        }
      />
      <Fact label="Status" value={scheme.status} />
      <Fact label="Last updated" value={fmtDateTime(scheme.lastUpdated)} />
      <Fact label="Last verified" value={scheme.lastVerified ? fmtDateTime(scheme.lastVerified) : 'Not yet verified'} />
      <Fact label="Data source" value={scheme.dataSource === 'live' ? 'LIVE' : 'MANUALLY IMPORTED'} />
      <Fact
        label="Verification"
        value={
          <span className="row" style={{ gap: 6 }}>
            <VerifiedBadge verified={isOfficial} />
            {!isOfficial && <StatusBadge status="Awaiting official verification" />}
          </span>
        }
      />
    </dl>
  );
}

function Fact({ label, value, wide = false }) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <dt className="muted" style={{ fontWeight: 600 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  );
}

export default function AdminSchemesPage() {
  const navigate = useNavigate();
  const { state, actions } = useStore();
  const schemes = state.schemes.filter((s) => !s.archived);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [status, setStatus] = useState('all');
  const [department, setDepartment] = useState('all');
  const [sort, setSort] = useState('name');
  const [view, setView] = useState('card');
  const [detailId, setDetailId] = useState(null);
  const [message, setMessage] = useState('');

  // Options for the category and department selects come from the schemes themselves.
  const categories = useMemo(() => [...new Set(schemes.map((s) => s.category).filter(Boolean))].sort(), [schemes]);
  const departments = useMemo(() => [...new Set(schemes.map((s) => s.department).filter(Boolean))].sort(), [schemes]);

  // Summary tiles, worked out from today's date.
  const now = Date.now();
  const tiles = {
    published: schemes.filter((s) => s.status === 'published').length,
    active: schemes.filter((s) => {
      const start = Date.parse(s.startDate);
      const end = Date.parse(s.endDate);
      return s.status === 'published' && start <= now && now <= end;
    }).length,
    upcoming: schemes.filter((s) => Date.parse(s.startDate) > now).length,
    expired: schemes.filter((s) => Date.parse(s.endDate) < now).length,
  };

  // Apply search and filters, then sort.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = schemes.filter((s) => {
      if (q && ![s.name, s.id, s.department].some((v) => String(v || '').toLowerCase().includes(q))) return false;
      if (category !== 'all' && s.category !== category) return false;
      if (level !== 'all' && s.level !== level) return false;
      if (status !== 'all' && s.status !== status) return false;
      if (department !== 'all' && s.department !== department) return false;
      return true;
    });
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (sort === 'closing') sorted.sort((a, b) => (Date.parse(a.endDate) || 0) - (Date.parse(b.endDate) || 0));
    if (sort === 'updated') sorted.sort((a, b) => (Date.parse(b.lastUpdated) || 0) - (Date.parse(a.lastUpdated) || 0));
    return sorted;
  }, [schemes, query, category, level, status, department, sort]);

  const detailScheme = detailId ? state.schemes.find((s) => s.id === detailId) : null;

  // Activate or deactivate. Only published and paused schemes can be toggled.
  function toggleActive(scheme) {
    const next = scheme.status === 'published' ? 'paused' : 'published';
    actions.setSchemeStatus(scheme.id, next);
    setMessage(next === 'published' ? `${scheme.name} is active again.` : `${scheme.name} is paused.`);
  }

  function archive(scheme) {
    if (!window.confirm(`Archive "${scheme.name}"? It will be hidden from this list and closed for citizens.`)) return;
    actions.archiveScheme(scheme.id);
    setMessage(`${scheme.name} was archived.`);
  }

  function resetFilters() {
    setQuery('');
    setCategory('all');
    setLevel('all');
    setStatus('all');
    setDepartment('all');
  }

  const selectStyle = { width: 'auto', minWidth: 160 };

  return (
    <AdminLayout
      title="Existing Schemes"
      helpSteps={[
        'Look at the four boxes at the top to see how many schemes are published, active, coming up, or expired.',
        'Type in the search box to find a scheme by name, ID or department.',
        'Use the filters and the sort box to narrow the list.',
        'Press View details to read every field of a scheme.',
        'Press Edit to change a scheme, or Activate and Deactivate to pause it for citizens.',
      ]}
    >
      <div className="notice notice-demo" role="note">{SAMPLE_DATA_BANNER}</div>

      {message && <div className="notice notice-success" role="status">{message}</div>}

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <Tile label="Published" value={tiles.published} />
        <Tile label="Active now" value={tiles.active} />
        <Tile label="Upcoming (starts later)" value={tiles.upcoming} />
        <Tile label="Expired (end date passed)" value={tiles.expired} />
      </div>

      <div className="card">
        <div className="grid grid-2">
          <div className="form-group">
            <label htmlFor="scheme-search">Search (name, ID or department)</label>
            <input id="scheme-search" className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="scheme-sort">Sort by</label>
            <select id="scheme-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Name A-Z</option>
              <option value="closing">Closing date (soonest first)</option>
              <option value="updated">Last updated (newest first)</option>
            </select>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filter-category">Category</label>
            <select id="filter-category" className="select" style={selectStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filter-level">Level</label>
            <select id="filter-level" className="select" style={selectStyle} value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="all">All</option>
              <option value="central">central</option>
              <option value="state">state</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filter-status">Status</label>
            <select id="filter-status" className="select" style={selectStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filter-department">Department</label>
            <select id="filter-department" className="select" style={{ ...selectStyle, minWidth: 220 }} value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="all">All</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="row">
          <button type="button" className={`btn ${view === 'card' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={view === 'card'} onClick={() => setView('card')}>
            Card view
          </button>
          <button type="button" className={`btn ${view === 'table' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={view === 'table'} onClick={() => setView('table')}>
            Table view
          </button>
          <button type="button" className="btn btn-ghost" onClick={resetFilters}>Clear filters</button>
          <span className="muted">Showing {visible.length} of {schemes.length}</span>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="card">
          <p>No schemes match your search or filters. Try clearing the filters.</p>
        </div>
      )}

      {view === 'card' &&
        visible.map((scheme) => (
          <article key={scheme.id} className="card" aria-labelledby={`title-${scheme.id}`}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id={`title-${scheme.id}`} style={{ fontSize: '1.15rem' }}>{scheme.name}</h2>
              <span className="badge badge-info">Scheme status: {scheme.status}</span>
            </div>
            <p>{scheme.description}</p>
            <SchemeFacts scheme={scheme} />
            <SchemeActions
              scheme={scheme}
              onDetails={() => setDetailId(scheme.id)}
              onEdit={() => navigate(`/admin/create-scheme?edit=${encodeURIComponent(scheme.id)}`)}
              onArchive={() => archive(scheme)}
              onToggle={() => toggleActive(scheme)}
            />
          </article>
        ))}

      {view === 'table' && visible.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Scheme</th>
                <th scope="col">Category</th>
                <th scope="col">Department</th>
                <th scope="col">Level</th>
                <th scope="col">Age / income</th>
                <th scope="col">Dates</th>
                <th scope="col">Status</th>
                <th scope="col">Verification</th>
                <th scope="col">Last updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <div className="muted">{s.id}</div>
                  </td>
                  <td>{s.category}</td>
                  <td>{s.department}</td>
                  <td>{s.level}</td>
                  <td>
                    {s.eligibility?.ageMin ?? 'Any'} to {s.eligibility?.ageMax ?? 'Any'} yrs
                    <div className="muted">Up to {inr(s.eligibility?.incomeMax)}</div>
                  </td>
                  <td>{fmtDate(s.startDate)} to {fmtDate(s.endDate)}</td>
                  <td>{s.status}</td>
                  <td>
                    <VerifiedBadge verified={s.verificationStatus === 'verified'} />
                  </td>
                  <td>{fmtDateTime(s.lastUpdated)}</td>
                  <td>
                    <SchemeActions
                      scheme={s}
                      compact
                      onDetails={() => setDetailId(s.id)}
                      onEdit={() => navigate(`/admin/create-scheme?edit=${encodeURIComponent(s.id)}`)}
                      onArchive={() => archive(s)}
                      onToggle={() => toggleActive(s)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailScheme && (
        <div className="modal-backdrop" onClick={() => setDetailId(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scheme-detail-title"
            style={{ maxWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setDetailId(null);
            }}
          >
            <h2 id="scheme-detail-title">{detailScheme.name}</h2>
            <p>{detailScheme.description}</p>
            <SchemeFacts scheme={detailScheme} />

            <h3 style={{ marginTop: 16 }}>Benefits</h3>
            <ul>
              {(detailScheme.benefits || []).length
                ? detailScheme.benefits.map((b) => <li key={b}>{b}</li>)
                : <li>None listed</li>}
            </ul>

            <h3>Documents</h3>
            {(detailScheme.documents || []).length === 0 && <p>None listed.</p>}
            {(detailScheme.documents || []).map((d, i) => (
              <div key={`${d.name}-${i}`} className="card" style={{ marginBottom: 8 }}>
                <strong>{d.name}</strong>
                <p className="muted" style={{ margin: '4px 0' }}>{d.whyNeeded}</p>
                <p style={{ margin: 0 }}>
                  Issued by: {d.issuingAuthority || 'Not set'}. Fee: {d.officialFee ? inr(d.officialFee) : 'Not verified - confirm with the issuing authority'}.
                  Processing time: {d.processingTime || 'Not verified - confirm with the issuing authority'}.
                </p>
              </div>
            ))}

            <h3>Steps</h3>
            <ol>
              {(detailScheme.steps || []).map((step) => <li key={step}>{step}</li>)}
            </ol>

            <p><strong>Contact:</strong> {detailScheme.contact || 'Not set'}</p>
            <p><strong>Source reference:</strong> {detailScheme.sourceReference || 'Not set'}</p>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDetailId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Tile({ label, value }) {
  return (
    <div className="tile" role="group" aria-label={label}>
      <span className="muted">{label}</span>
      <strong style={{ fontSize: '1.8rem' }}>{value}</strong>
    </div>
  );
}

// Buttons for one scheme. Activate and Deactivate work only for published and paused schemes.
function SchemeActions({ scheme, compact = false, onDetails, onEdit, onArchive, onToggle }) {
  const canToggle = scheme.status === 'published' || scheme.status === 'paused';
  const toggleLabel = scheme.status === 'published' ? 'Deactivate' : 'Activate';
  const size = compact ? { minHeight: 36, padding: '6px 10px' } : undefined;
  return (
    <div className="row" style={{ marginTop: compact ? 0 : 12, gap: 6 }}>
      <button type="button" className="btn btn-secondary" style={size} onClick={onDetails}>View details</button>
      <button type="button" className="btn btn-secondary" style={size} onClick={onEdit}>Edit</button>
      <button
        type="button"
        className="btn btn-secondary"
        style={size}
        onClick={onToggle}
        disabled={!canToggle}
        title={canToggle ? undefined : 'Only published or paused schemes can be activated or deactivated.'}
      >
        {canToggle ? toggleLabel : 'Activate / Deactivate'}
      </button>
      <button type="button" className="btn btn-danger" style={size} onClick={onArchive}>Archive</button>
    </div>
  );
}
