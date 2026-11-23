// Admin page 3: Create / Edit Scheme. A long form in sections A to E, with validation,
// a citizen-view preview, and publish (which also matches family members and sends notifications).
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '../components/Layout.jsx';
import { useStore } from '../lib/store.jsx';
import { evaluateSchemeForMember, ELIGIBILITY_STATUS } from '../lib/eligibility.js';
import { getScheme, saveScheme } from '../services/schemeService.js';
import { OCCUPATIONS, EDUCATION_LEVELS, TELANGANA_DISTRICTS } from '../data/sampleData.js';

// ---------- Small helpers ----------

// Each document row gets a unique key so React can add and remove rows safely.
let docCounter = 0;
const DOC_FIELDS = [
  'name', 'whyNeeded', 'issuingAuthority', 'whereToObtain', 'officialWebsite',
  'procedure', 'officialFee', 'processingTime',
];

function newDoc(values = {}) {
  docCounter += 1;
  const row = { _k: docCounter };
  for (const field of DOC_FIELDS) row[field] = values[field] == null ? '' : String(values[field]);
  return row;
}

// Turn a textarea (one item per line) into a clean list. Blank lines are dropped.
function toLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

// Blank input means "not set" (null). Anything else is read as a number.
function numOrNull(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : Number(text);
}

function isNumberText(value) {
  const text = String(value ?? '').trim();
  return text === '' || !Number.isNaN(Number(text));
}

// Date-time inputs use local time "YYYY-MM-DDTHH:mm". The store uses ISO text in UTC.
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isHttps(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

// Suggest the next demo ID, for example SCH-DEMO-010 after SCH-DEMO-009.
function suggestId(schemes) {
  const numbers = schemes
    .map((s) => /^SCH-DEMO-(\d+)$/.exec(s.id))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `SCH-DEMO-${String(next).padStart(3, '0')}`;
}

function blankForm(id) {
  return {
    name: '', id, description: '', department: '', category: '', level: 'state', targetBeneficiaries: '', benefits: '',
    ageMin: '', ageMax: '', incomeMax: '', occupations: [], educations: [], state: 'Telangana', districts: [],
    landholdingMaxAcres: '', gender: 'any', additionalConditions: '', questions: '',
    documents: [newDoc()],
    startDate: '', endDate: '', steps: '', officialLink: '', contact: '', sourceReference: '',
    verifiedFlag: false,
  };
}

// Load a saved scheme into form values (the reverse of buildScheme).
function fromScheme(s) {
  const e = s.eligibility || {};
  return {
    name: s.name || '', id: s.id, description: s.description || '', department: s.department || '',
    category: s.category || '', level: s.level || 'state', targetBeneficiaries: s.targetBeneficiaries || '',
    benefits: (s.benefits || []).join('\n'),
    ageMin: e.ageMin ?? '', ageMax: e.ageMax ?? '', incomeMax: e.incomeMax ?? '',
    occupations: e.occupations || [], educations: e.educations || [], state: e.state || '',
    districts: e.districts || [], landholdingMaxAcres: e.landholdingMaxAcres ?? '',
    gender: e.gender ? String(e.gender).toLowerCase() : 'any',
    additionalConditions: (s.additionalConditions || []).join('\n'),
    questions: (s.questions || []).join('\n'),
    documents: (s.documents || []).length ? s.documents.map((d) => newDoc(d)) : [newDoc()],
    startDate: toLocalInput(s.startDate), endDate: toLocalInput(s.endDate),
    steps: (s.steps || []).join('\n'), officialLink: s.officialLink || '',
    contact: s.contact || '', sourceReference: s.sourceReference || '',
    verifiedFlag: false,
  };
}

// Build the scheme object that goes to the store from the form values.
// "existing" is the saved scheme when editing; it keeps fields the form does not show.
function buildScheme(form, { status, verificationStatus, lastVerified, existing }) {
  const capitalise = (word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : null);
  const listOrNull = (arr) => (arr.length ? arr : null);
  return {
    ...(existing || {}),
    id: form.id.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    department: form.department.trim(),
    category: form.category.trim(),
    level: form.level,
    targetBeneficiaries: form.targetBeneficiaries.trim(),
    benefits: toLines(form.benefits),
    eligibility: {
      ageMin: numOrNull(form.ageMin),
      ageMax: numOrNull(form.ageMax),
      incomeMax: numOrNull(form.incomeMax),
      occupations: listOrNull(form.occupations),
      educations: listOrNull(form.educations),
      state: form.state.trim() || null,
      districts: listOrNull(form.districts),
      landholdingMaxAcres: numOrNull(form.landholdingMaxAcres),
      gender: form.gender === 'any' ? null : capitalise(form.gender),
    },
    additionalConditions: toLines(form.additionalConditions),
    questions: toLines(form.questions),
    documents: form.documents
      .filter((d) => d.name.trim())
      .map((d) => ({
        name: d.name.trim(),
        whyNeeded: d.whyNeeded.trim() || null,
        issuingAuthority: d.issuingAuthority.trim() || null,
        whereToObtain: d.whereToObtain.trim() || null,
        officialWebsite: d.officialWebsite.trim() || null,
        procedure: d.procedure.trim() || null,
        // Blank means not verified. Null is shown as "Not verified" everywhere.
        officialFee: numOrNull(d.officialFee),
        processingTime: d.processingTime.trim() || null,
        onlineApplicationAvailable: null,
      })),
    steps: toLines(form.steps),
    startDate: fromLocalInput(form.startDate),
    endDate: fromLocalInput(form.endDate),
    status,
    verificationStatus,
    lastVerified,
    officialLink: form.officialLink.trim(),
    contact: form.contact.trim(),
    sourceReference: form.sourceReference.trim(),
    dataSource: existing?.dataSource ?? 'manual',
    isDemo: existing?.isDemo ?? false,
    archived: false,
  };
}

// Check the form. mode 'draft' checks only name and ID. Every other action checks everything.
// Returns a list of messages (empty list = OK), so all problems show together.
function validate(form, mode, { lockedId, idIsTaken }) {
  const errors = [];
  const name = form.name.trim();
  const id = form.id.trim();

  if (!name) errors.push('Scheme name is required.');
  if (!id) {
    errors.push('Scheme ID is required.');
  } else if (!/^[A-Za-z0-9-]+$/.test(id)) {
    errors.push('Scheme ID can only use letters, numbers and hyphens.');
  } else if (id !== lockedId && idIsTaken(id)) {
    errors.push('This Scheme ID is already used by another scheme. Choose a different ID.');
  }
  if (mode === 'draft') return errors;

  if (!form.description.trim() && toLines(form.benefits).length === 0) {
    errors.push('Add a description or at least one benefit.');
  }
  if (!form.department.trim()) errors.push('Department is required.');
  if (!['central', 'state'].includes(form.level)) errors.push('Choose a level: central or state.');
  if (!form.startDate) errors.push('Start date is required.');
  if (!form.endDate) errors.push('End date is required.');
  if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
    errors.push('End date must be after the start date.');
  }
  if (!isNumberText(form.ageMin) || !isNumberText(form.ageMax)) {
    errors.push('Ages must be numbers.');
  } else if (form.ageMin !== '' && form.ageMax !== '' && Number(form.ageMin) > Number(form.ageMax)) {
    errors.push('Minimum age cannot be more than maximum age.');
  }
  if (!isNumberText(form.incomeMax)) errors.push('Income limit must be a number (INR).');
  if (!isNumberText(form.landholdingMaxAcres)) errors.push('Land holding limit must be a number of acres.');

  if (!form.documents.some((d) => d.name.trim())) {
    errors.push('Add at least one document with a name.');
  }
  form.documents.forEach((d, i) => {
    if (!isNumberText(d.officialFee)) {
      errors.push(`Fee for document ${i + 1} must be a number. Leave it blank if not verified.`);
    }
    if (d.officialWebsite.trim() && !isHttps(d.officialWebsite.trim())) {
      errors.push(`Website for document ${i + 1} must be a full https:// address.`);
    }
  });

  if (!isHttps(form.officialLink.trim())) errors.push('Official link must be a full https:// web address.');
  return errors;
}

// ---------- Small form pieces ----------

function Field({ id, label, hint, children }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="muted" style={{ margin: 0 }}>{hint}</p>}
    </div>
  );
}

// A group of tick boxes. Used for occupations, education levels and districts.
function CheckGroup({ legend, options, selected, onToggle, columns = 'grid-2' }) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
      <legend style={{ fontWeight: 600, marginBottom: 6 }}>{legend}</legend>
      <div className={`grid ${columns}`} style={{ gap: 6 }}>
        {options.map((opt) => (
          <label key={opt} className="row" style={{ gap: 8, minHeight: 36 }}>
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} style={{ width: 20, height: 20 }} />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Citizen-view preview. Shows the scheme the way a citizen would read it. Nothing is saved.
function SchemePreview({ scheme }) {
  const e = scheme.eligibility;
  return (
    <div className="card" role="region" aria-label="Citizen view preview">
      <p className="notice notice-demo">PREVIEW ONLY. This is how a citizen would see the scheme. It is not saved or published.</p>
      <h2>{scheme.name || 'Scheme name not entered'}</h2>
      <p className="muted">{scheme.department} · {scheme.level} level · {scheme.category}</p>
      <p>{scheme.description}</p>
      <h3>Benefits</h3>
      <ul>{scheme.benefits.length ? scheme.benefits.map((b) => <li key={b}>{b}</li>) : <li>Not entered</li>}</ul>
      <h3>Who can apply</h3>
      <ul>
        <li>Age: {e.ageMin ?? 'any'} to {e.ageMax ?? 'any'} years</li>
        <li>Yearly family income: {e.incomeMax !== null ? `up to INR ${e.incomeMax.toLocaleString('en-IN')}` : 'no limit set'}</li>
        <li>Occupation: {e.occupations ? e.occupations.join(', ') : 'any'}</li>
        <li>Education: {e.educations ? e.educations.join(', ') : 'any'}</li>
        <li>State: {e.state || 'any'}. Districts: {e.districts ? e.districts.join(', ') : 'all districts'}</li>
        {e.gender && <li>Gender: {e.gender}</li>}
        {e.landholdingMaxAcres !== null && <li>Land holding up to {e.landholdingMaxAcres} acres</li>}
      </ul>
      {scheme.additionalConditions.length > 0 && (
        <>
          <h3>Other conditions</h3>
          <ul>{scheme.additionalConditions.map((c) => <li key={c}>{c}</li>)}</ul>
        </>
      )}
      <h3>Documents</h3>
      <ul>
        {scheme.documents.map((d) => (
          <li key={d.name}>
            <strong>{d.name}</strong>{d.whyNeeded ? `: ${d.whyNeeded}` : ''}
            <br />
            Fee: {d.officialFee !== null ? `INR ${d.officialFee}` : 'Not verified - confirm with the issuing authority'}.
            Processing time: {d.processingTime || 'Not verified - confirm with the issuing authority'}.
          </li>
        ))}
      </ul>
      <h3>Steps</h3>
      <ol>{scheme.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <p>Dates: {scheme.startDate ? new Date(scheme.startDate).toLocaleDateString('en-IN') : 'not set'} to {scheme.endDate ? new Date(scheme.endDate).toLocaleDateString('en-IN') : 'not set'}</p>
      <p>Official website: {scheme.officialLink || 'not set'}</p>
    </div>
  );
}

// ---------- The page ----------

export default function CreateSchemePage() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { state, actions } = useStore();

  // The ID of the scheme this form is bound to. Set when editing or after the first save.
  const [lockedId, setLockedId] = useState(null);
  const [form, setForm] = useState(() => blankForm(suggestId(state.schemes)));
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Edit mode: load the scheme named in ?edit=<id> and fill the form.
  useEffect(() => {
    if (!editId) return undefined;
    let cancelled = false;
    getScheme(editId).then((found) => {
      if (cancelled) return;
      if (!found) {
        setLoadError(`No scheme found with ID ${editId}.`);
        return;
      }
      setForm(fromScheme(found));
      setLockedId(found.id);
    });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const idIsTaken = (id) => state.schemes.some((s) => s.id === id);
  const existing = lockedId ? state.schemes.find((s) => s.id === lockedId) : null;
  const isSavedInStore = Boolean(existing);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleIn(key, value) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  }

  function setDoc(index, key, value) {
    setForm((f) => ({
      ...f,
      documents: f.documents.map((d, i) => (i === index ? { ...d, [key]: value } : d)),
    }));
  }

  function addDoc() {
    setForm((f) => ({ ...f, documents: [...f.documents, newDoc()] }));
  }

  function removeDoc(index) {
    setForm((f) => ({ ...f, documents: f.documents.filter((_, i) => i !== index) }));
  }

  // Shared path for every action that saves the scheme.
  function run(mode) {
    const found = validate(form, mode, { lockedId, idIsTaken });
    setErrors(found);
    setMessage('');
    return found.length === 0;
  }

  function bindAfterSave(id) {
    setLockedId(id);
  }

  async function saveDraft() {
    if (!run('draft')) return;
    const scheme = buildScheme(form, {
      status: 'draft',
      verificationStatus: 'awaiting',
      lastVerified: existing?.lastVerified ?? null,
      existing,
    });
    await saveScheme(scheme);
    bindAfterSave(scheme.id);
    setMessage('Draft saved. It is not visible to citizens.');
  }

  async function submitForVerification() {
    if (!run('full')) return;
    const scheme = buildScheme(form, {
      status: 'draft',
      verificationStatus: 'awaiting',
      lastVerified: existing?.lastVerified ?? null,
      existing,
    });
    await saveScheme(scheme);
    bindAfterSave(scheme.id);
    setMessage('Sent for verification');
  }

  async function publish() {
    if (!run('full')) return;

    // Verified only when the admin ticks the box AND gives a source reference.
    const verified = form.verifiedFlag && form.sourceReference.trim() !== '';
    const scheme = buildScheme(form, {
      status: 'published',
      verificationStatus: verified ? 'verified' : 'awaiting',
      lastVerified: verified ? new Date().toISOString() : existing?.lastVerified ?? null,
      existing,
    });
    await saveScheme(scheme);
    bindAfterSave(scheme.id);
    actions.addAdminLog({ action: 'publish_scheme', target: scheme.id, detail: scheme.verificationStatus });

    // Match every family member in every citizen account against the new scheme.
    let memberCount = 0;
    const accounts = new Set();
    const today = new Date();
    for (const citizen of Object.values(state.citizens)) {
      const district = citizen.profile?.district;
      for (const member of citizen.familyMembers || []) {
        const result = evaluateSchemeForMember(scheme, { ...member, district }, today);
        if (result.status !== ELIGIBILITY_STATUS.LIKELY && result.status !== ELIGIBILITY_STATUS.MORE_INFO) continue;
        memberCount += 1;
        accounts.add(citizen.phone);
        actions.addNotification(citizen.phone, {
          key: `new-scheme:${scheme.id}:${citizen.phone}:${member.id}`,
          type: 'new_match',
          title: 'New scheme may match (sample)',
          message: `${scheme.name} may match ${member.name}: ${result.status}.`,
          schemeId: scheme.id,
        });
      }
    }

    let text = `Published. ${memberCount} family members across ${accounts.size} accounts were matched.`;
    if (scheme.verificationStatus !== 'verified') {
      text += ' The scheme is still awaiting official verification, so the rules show it that way and no matches are sent until it is verified.';
    }
    setMessage(text);
  }

  // Pause and Close only work on a scheme that is already saved.
  function changeStatus(status, logAction, text) {
    if (!isSavedInStore) {
      setErrors(['Save the scheme first, then you can pause or close it.']);
      return;
    }
    actions.setSchemeStatus(lockedId, status);
    actions.addAdminLog({ action: logAction, target: lockedId });
    setErrors([]);
    setMessage(text);
  }

  // Preview uses the current form values. It does not check them or save anything.
  const previewScheme = buildScheme(form, {
    status: 'draft',
    verificationStatus: 'awaiting',
    lastVerified: null,
    existing: null,
  });

  const formTitle = lockedId ? 'Edit scheme' : 'Create scheme';

  return (
    <AdminLayout
      title={formTitle}
      helpSteps={[
        'Sections A to D hold the scheme details. Required fields are marked in the validation list when you press a button.',
        'Add every document the citizen needs. Leave the fee or processing time blank if it is not verified.',
        'Save as Draft keeps your work hidden from citizens.',
        'Preview shows the scheme as a citizen would see it.',
        'Publish is blocked until all required fields are correct. Tick "Verified against an official source" only if you checked the official notification.',
      ]}
    >
      {loadError && <div className="notice notice-error" role="alert">{loadError}</div>}

      {errors.length > 0 && (
        <div className="notice notice-error" role="alert">
          <strong>Please fix these before continuing:</strong>
          <ul style={{ margin: '6px 0 0' }}>
            {errors.map((err) => <li key={err}>{err}</li>)}
          </ul>
        </div>
      )}
      {message && <div className="notice notice-success" role="status">{message}</div>}

      <form onSubmit={(e) => e.preventDefault()} noValidate>
        {/* Section A */}
        <section className="card" aria-labelledby="sec-a">
          <h2 id="sec-a">A. Basic details</h2>
          <Field id="s-name" label="Scheme name">
            <input id="s-name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field id="s-id" label="Scheme ID" hint={lockedId ? 'The ID cannot change after the scheme is saved.' : 'Suggested automatically. You can change it.'}>
            <input id="s-id" className="input" value={form.id} readOnly={Boolean(lockedId)} onChange={(e) => set('id', e.target.value)} />
          </Field>
          <Field id="s-desc" label="Description">
            <textarea id="s-desc" className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="grid grid-2">
            <Field id="s-dept" label="Department">
              <input id="s-dept" className="input" value={form.department} onChange={(e) => set('department', e.target.value)} />
            </Field>
            <Field id="s-cat" label="Category">
              <input id="s-cat" className="input" value={form.category} onChange={(e) => set('category', e.target.value)} />
            </Field>
            <Field id="s-level" label="Level">
              <select id="s-level" className="select" value={form.level} onChange={(e) => set('level', e.target.value)}>
                <option value="central">central</option>
                <option value="state">state</option>
              </select>
            </Field>
            <Field id="s-target" label="Target beneficiaries">
              <input id="s-target" className="input" value={form.targetBeneficiaries} onChange={(e) => set('targetBeneficiaries', e.target.value)} />
            </Field>
          </div>
          <Field id="s-benefits" label="Benefits (one per line)">
            <textarea id="s-benefits" className="textarea" value={form.benefits} onChange={(e) => set('benefits', e.target.value)} />
          </Field>
        </section>

        {/* Section B */}
        <section className="card" aria-labelledby="sec-b">
          <h2 id="sec-b">B. Who can apply</h2>
          <div className="grid grid-3">
            <Field id="s-agemin" label="Minimum age">
              <input id="s-agemin" className="input" type="number" min="0" value={form.ageMin} onChange={(e) => set('ageMin', e.target.value)} />
            </Field>
            <Field id="s-agemax" label="Maximum age">
              <input id="s-agemax" className="input" type="number" min="0" value={form.ageMax} onChange={(e) => set('ageMax', e.target.value)} />
            </Field>
            <Field id="s-income" label="Income limit (yearly, INR)">
              <input id="s-income" className="input" type="number" min="0" value={form.incomeMax} onChange={(e) => set('incomeMax', e.target.value)} />
            </Field>
          </div>
          <CheckGroup legend="Occupations (none ticked = any)" options={OCCUPATIONS} selected={form.occupations} onToggle={(v) => toggleIn('occupations', v)} />
          <CheckGroup legend="Education levels (none ticked = any)" options={EDUCATION_LEVELS} selected={form.educations} onToggle={(v) => toggleIn('educations', v)} />
          <div className="grid grid-2">
            <Field id="s-state" label="State">
              <input id="s-state" className="input" value={form.state} onChange={(e) => set('state', e.target.value)} />
            </Field>
            <Field id="s-land" label="Land holding maximum (acres, optional)">
              <input id="s-land" className="input" type="number" min="0" step="0.1" value={form.landholdingMaxAcres} onChange={(e) => set('landholdingMaxAcres', e.target.value)} />
            </Field>
          </div>
          <Field id="s-gender" label="Gender (optional)">
            <select id="s-gender" className="select" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="any">Any</option>
              <option value="female">Female only</option>
              <option value="male">Male only</option>
            </select>
          </Field>
          <CheckGroup legend="Districts (none ticked = all districts)" options={TELANGANA_DISTRICTS} selected={form.districts} onToggle={(v) => toggleIn('districts', v)} columns="grid-3" />
          <Field id="s-conditions" label="Additional conditions (one per line)">
            <textarea id="s-conditions" className="textarea" value={form.additionalConditions} onChange={(e) => set('additionalConditions', e.target.value)} />
          </Field>
          <Field id="s-questions" label="Questions to ask the citizen (one per line)">
            <textarea id="s-questions" className="textarea" value={form.questions} onChange={(e) => set('questions', e.target.value)} />
          </Field>
        </section>

        {/* Section C */}
        <section className="card" aria-labelledby="sec-c">
          <h2 id="sec-c">C. Documents</h2>
          <p className="muted">Leave fee or processing time blank if it is not verified. It will show as "Not verified - confirm with the issuing authority".</p>
          {form.documents.map((doc, index) => (
            <fieldset key={doc._k} className="card" style={{ margin: '0 0 12px' }}>
              <legend style={{ fontWeight: 600 }}>Document {index + 1}</legend>
              <div className="grid grid-2">
                <Field id={`d${doc._k}-name`} label="Document name">
                  <input id={`d${doc._k}-name`} className="input" value={doc.name} onChange={(e) => setDoc(index, 'name', e.target.value)} />
                </Field>
                <Field id={`d${doc._k}-why`} label="Why it is needed">
                  <input id={`d${doc._k}-why`} className="input" value={doc.whyNeeded} onChange={(e) => setDoc(index, 'whyNeeded', e.target.value)} />
                </Field>
                <Field id={`d${doc._k}-auth`} label="Issuing authority">
                  <input id={`d${doc._k}-auth`} className="input" value={doc.issuingAuthority} onChange={(e) => setDoc(index, 'issuingAuthority', e.target.value)} />
                </Field>
                <Field id={`d${doc._k}-where`} label="Where to get it">
                  <input id={`d${doc._k}-where`} className="input" value={doc.whereToObtain} onChange={(e) => setDoc(index, 'whereToObtain', e.target.value)} />
                </Field>
                <Field id={`d${doc._k}-web`} label="Official website (https)">
                  <input id={`d${doc._k}-web`} className="input" value={doc.officialWebsite} onChange={(e) => setDoc(index, 'officialWebsite', e.target.value)} />
                </Field>
                <Field id={`d${doc._k}-fee`} label="Official fee (INR, blank = not verified)">
                  <input id={`d${doc._k}-fee`} className="input" type="number" min="0" value={doc.officialFee} onChange={(e) => setDoc(index, 'officialFee', e.target.value)} />
                </Field>
                <Field id={`d${doc._k}-time`} label="Processing time (blank = not verified)">
                  <input id={`d${doc._k}-time`} className="input" value={doc.processingTime} onChange={(e) => setDoc(index, 'processingTime', e.target.value)} />
                </Field>
              </div>
              <Field id={`d${doc._k}-proc`} label="Procedure">
                <textarea id={`d${doc._k}-proc`} className="textarea" value={doc.procedure} onChange={(e) => setDoc(index, 'procedure', e.target.value)} />
              </Field>
              <button type="button" className="btn btn-danger" onClick={() => removeDoc(index)}>
                Remove document {index + 1}
              </button>
            </fieldset>
          ))}
          <button type="button" className="btn btn-secondary" onClick={addDoc}>Add document</button>
        </section>

        {/* Section D */}
        <section className="card" aria-labelledby="sec-d">
          <h2 id="sec-d">D. Dates, steps and sources</h2>
          <div className="grid grid-2">
            <Field id="s-start" label="Start date and time">
              <input id="s-start" className="input" type="datetime-local" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </Field>
            <Field id="s-end" label="End date and time">
              <input id="s-end" className="input" type="datetime-local" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </Field>
          </div>
          <Field id="s-steps" label="Steps to apply (one per line)">
            <textarea id="s-steps" className="textarea" value={form.steps} onChange={(e) => set('steps', e.target.value)} />
          </Field>
          <Field id="s-link" label="Official link (https)">
            <input id="s-link" className="input" type="url" value={form.officialLink} onChange={(e) => set('officialLink', e.target.value)} />
          </Field>
          <Field id="s-contact" label="Contact">
            <input id="s-contact" className="input" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
          </Field>
          <Field id="s-source" label="Source reference (notification or document reference)">
            <input id="s-source" className="input" value={form.sourceReference} onChange={(e) => set('sourceReference', e.target.value)} />
          </Field>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <input
              id="s-verified"
              type="checkbox"
              checked={form.verifiedFlag}
              onChange={(e) => set('verifiedFlag', e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <label htmlFor="s-verified">Verified against an official source</label>
          </div>
        </section>

        {/* Section E */}
        <section className="card" aria-labelledby="sec-e">
          <h2 id="sec-e">E. Actions</h2>
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={saveDraft}>Save as Draft</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>
              Preview
            </button>
            <button type="button" className="btn btn-secondary" onClick={submitForVerification}>Submit for Verification</button>
            <button type="button" className="btn btn-primary" onClick={publish}>Publish</button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => changeStatus('paused', 'pause_scheme', 'Scheme paused.')}
              disabled={!isSavedInStore}
            >
              Pause
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => changeStatus('closed', 'close_scheme', 'Scheme closed.')}
              disabled={!isSavedInStore}
            >
              Close Scheme
            </button>
          </div>
          {!isSavedInStore && (
            <p className="muted" style={{ marginTop: 8 }}>Pause and Close are available after the scheme is saved.</p>
          )}
        </section>
      </form>

      {showPreview && <SchemePreview scheme={previewScheme} />}
    </AdminLayout>
  );
}
