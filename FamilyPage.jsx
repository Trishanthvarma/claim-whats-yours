// My Family: one member card at a time with Previous / Next. Add, edit and delete members.
// Only the fields needed for scheme matching are collected.
import { useState } from 'react';
import { CitizenLayout } from '../components/Layout.jsx';
import { useStore } from '../lib/store.jsx';
import { addMember, updateMember, deleteMember } from '../services/familyService.js';
import { RELATIONSHIPS, OCCUPATIONS, EDUCATION_LEVELS, TELANGANA_DISTRICTS } from '../data/sampleData.js';

// An empty card. All values are strings while the user types; toStored() converts them.
const BLANK_MEMBER = {
  name: '',
  relationship: '',
  age: '',
  occupation: '',
  education: '',
  familyIncome: '',
  state: 'Telangana',
  district: '',
  gender: '',
  landholdingAcres: '',
  disability: '',
  casteCategory: '',
};

// Turn a saved member into form values (strings, empty instead of null).
function toForm(member) {
  const form = { ...BLANK_MEMBER };
  for (const key of Object.keys(BLANK_MEMBER)) {
    const value = member[key];
    form[key] = value === null || value === undefined ? '' : String(value);
  }
  return form;
}

// Turn form values into the saved shape. Empty optional numbers become null.
function toStored(form) {
  const numberOrNull = (value) => (value === '' ? null : Number(value));
  return {
    name: form.name.trim(),
    relationship: form.relationship,
    age: Number(form.age),
    occupation: form.occupation || null,
    education: form.education || null,
    familyIncome: numberOrNull(form.familyIncome),
    state: form.state || null,
    district: form.district || null,
    gender: form.gender || null,
    landholdingAcres: numberOrNull(form.landholdingAcres),
    disability: form.disability || null,
    casteCategory: form.casteCategory || null,
  };
}

// Check the form. Returns field -> message. Empty object means no problems.
function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Enter the full name.';
  if (!form.relationship) errors.relationship = 'Choose the relationship to you.';
  if (form.age === '') {
    errors.age = 'Enter the age.';
  } else {
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 0 || age > 120) errors.age = 'Age must be a whole number from 0 to 120.';
  }
  if (form.familyIncome !== '') {
    const income = Number(form.familyIncome);
    if (Number.isNaN(income) || income < 0) errors.familyIncome = 'Enter the income as a number, 0 or more.';
  }
  if (form.landholdingAcres !== '') {
    const acres = Number(form.landholdingAcres);
    if (Number.isNaN(acres) || acres < 0) errors.landholdingAcres = 'Enter the land as a number, 0 or more.';
  }
  return errors;
}

export default function FamilyPage() {
  const { state } = useStore();
  const phone = state.session.phone;
  const members = state.citizens[phone]?.familyMembers ?? [];

  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(BLANK_MEMBER);
  const [errors, setErrors] = useState({});

  // Keep the index inside the list, even after a delete.
  const safeIndex = Math.min(index, Math.max(0, members.length - 1));
  const current = members[safeIndex] ?? null;
  const showingForm = editing || isNew;
  const card = showingForm ? form : current ? toForm(current) : null;

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Open a blank card in edit mode.
  function startAdd() {
    setForm(BLANK_MEMBER);
    setErrors({});
    setIsNew(true);
    setEditing(true);
  }

  // Start editing the card on screen. The form gets a copy of its values.
  function startEdit() {
    if (!current) return;
    setForm(toForm(current));
    setErrors({});
    setEditing(true);
  }

  // Cancel: a new card is thrown away; an existing card goes back to its saved values.
  function cancelEdit() {
    setErrors({});
    setIsNew(false);
    setEditing(false);
  }

  async function handleSave() {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const stored = toStored(form);
    if (isNew) {
      // The new member is added at the end of the list, so it is at this position.
      const newPosition = members.length;
      await addMember(phone, stored);
      setIndex(newPosition);
    } else if (current) {
      await updateMember(phone, current.id, stored);
    }
    setIsNew(false);
    setEditing(false);
  }

  async function handleDelete() {
    if (!current) return;
    const ok = window.confirm(`Delete ${current.name || 'this member'} from your family list? This cannot be undone.`);
    if (!ok) return;
    await deleteMember(phone, current.id);
    // One fewer card: keep the position inside the new range.
    setIndex(Math.max(0, Math.min(safeIndex, members.length - 2)));
  }

  const age = Number(card?.age);
  const showGuardianNotice = card && card.age !== '' && !Number.isNaN(age) && age < 18;
  const navDisabled = showingForm;
  const isEmpty = members.length === 0 && !isNew;

  // Show one field. The input is disabled when the card is not in edit mode.
  function renderSelect(id, label, value, options, field, extra = {}) {
    const error = errors[field];
    return (
      <div className="form-group">
        <label htmlFor={id}>{label}</label>
        <select
          id={id}
          className="select"
          value={value}
          onChange={(e) => setField(field, e.target.value)}
          disabled={!showingForm}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...extra}
        >
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
        {error && <p id={`${id}-error`} className="error-text">{error}</p>}
      </div>
    );
  }

  function renderInput(id, label, field, props = {}) {
    const error = errors[field];
    return (
      <div className="form-group">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          className="input"
          value={card?.[field] ?? ''}
          onChange={(e) => setField(field, e.target.value)}
          disabled={!showingForm}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && <p id={`${id}-error`} className="error-text">{error}</p>}
      </div>
    );
  }

  return (
    <CitizenLayout
      title="My Family"
      helpSteps={[
        'Each card shows one family member. Use Previous and Next to move between them.',
        'Press Add member to add someone new. Fill in the card and press Save.',
        'Press Edit to change a card. Press Cancel to undo your changes.',
        'Press Delete to remove a member after you confirm.',
        'Only enter what is needed for scheme matching.',
      ]}
    >
      <p className="notice">Collect only what is needed for scheme matching.</p>

      <div className="row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={startAdd} disabled={showingForm}>
          Add member
        </button>
      </div>

      {isEmpty ? (
        <div className="card">
          <h2>No family members yet</h2>
          <p>Add the people in your family so SchemeSaathi can check schemes for them.</p>
          <button type="button" className="btn btn-primary" onClick={startAdd}>
            Add first family member
          </button>
        </div>
      ) : (
        <section className="card" aria-label="Family member card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIndex(safeIndex - 1)}
              disabled={navDisabled || safeIndex <= 0}
            >
              Previous
            </button>
            <p aria-live="polite" style={{ margin: 0, fontWeight: 600 }}>
              {isNew ? 'New member' : `${safeIndex + 1} of ${members.length}`}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIndex(safeIndex + 1)}
              disabled={navDisabled || safeIndex >= members.length - 1}
            >
              Next
            </button>
          </div>

          {showGuardianNotice && (
            <p className="notice">
              Guardian consent: a parent or guardian must agree on this person's behalf.
            </p>
          )}

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="sr-only">Family member details</legend>
            {renderInput('m-name', 'Full name', 'name')}
            {renderSelect('m-relationship', 'Relationship to you', card?.relationship ?? '', [
              { value: '', label: 'Choose' },
              ...RELATIONSHIPS,
            ], 'relationship')}

            <div className="grid-2">
              {renderInput('m-age', 'Age (0-120)', 'age', { type: 'number', min: 0, max: 120, inputMode: 'numeric' })}
              {renderInput('m-income', 'Annual family income (INR)', 'familyIncome', { type: 'number', min: 0, inputMode: 'numeric' })}
            </div>

            <div className="grid-2">
              {renderSelect('m-occupation', 'Occupation', card?.occupation ?? '', [
                { value: '', label: 'Not entered' },
                ...OCCUPATIONS,
              ], 'occupation')}
              {renderSelect('m-education', 'Education', card?.education ?? '', [
                { value: '', label: 'Not entered' },
                ...EDUCATION_LEVELS,
              ], 'education')}
            </div>

            <div className="grid-2">
              {renderInput('m-state', 'State', 'state')}
              {renderSelect('m-district', 'District', card?.district ?? '', [
                { value: '', label: 'Choose a district' },
                ...TELANGANA_DISTRICTS,
              ], 'district')}
            </div>

            <div className="grid-2">
              {renderSelect('m-gender', 'Gender', card?.gender ?? '', [
                { value: '', label: 'Not specified' },
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
                { value: 'Other', label: 'Other' },
              ], 'gender')}
              {renderInput('m-land', 'Land holding (acres, optional)', 'landholdingAcres', { type: 'number', min: 0, step: 'any' })}
            </div>

            <div className="grid-2">
              {renderSelect('m-disability', 'Disability status (optional)', card?.disability ?? '', [
                { value: '', label: 'Not entered' },
                { value: 'none', label: 'None' },
                { value: 'yes', label: 'Yes' },
                { value: 'prefer not to say', label: 'Prefer not to say' },
              ], 'disability')}
              <div>
                {renderSelect('m-caste', 'Caste category (optional)', card?.casteCategory ?? '', [
                  { value: '', label: 'Not entered' },
                  { value: 'General', label: 'General' },
                  { value: 'BC', label: 'BC' },
                  { value: 'SC', label: 'SC' },
                  { value: 'ST', label: 'ST' },
                  { value: 'EWS', label: 'EWS' },
                  { value: 'Prefer not to say', label: 'Prefer not to say' },
                ], 'casteCategory')}
                <p className="muted" style={{ marginTop: -8 }}>
                  Only needed if a scheme asks for it. Optional.
                </p>
              </div>
            </div>
          </fieldset>

          <div className="row" style={{ marginTop: 12 }}>
            {!showingForm && current && (
              <>
                <button type="button" className="btn btn-primary" onClick={startEdit}>
                  Edit
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              </>
            )}
            {showingForm && (
              <>
                <button type="button" className="btn btn-primary" onClick={handleSave}>
                  Save
                </button>
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </CitizenLayout>
  );
}
