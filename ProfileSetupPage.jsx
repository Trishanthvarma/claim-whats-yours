// Profile setup: the citizen enters name, district, language and consent before using the portal.
// The phone number comes from the login session and cannot be changed here.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CitizenLayout } from '../components/Layout.jsx';
import { useStore, storeActions } from '../lib/store.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { TELANGANA_DISTRICTS } from '../data/sampleData.js';

const LANGUAGES = [
  { code: 'te', label: 'Telugu (te)' },
  { code: 'en', label: 'English (en)' },
  { code: 'hi', label: 'Hindi (hi)' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Check all fields at once. Returns an object of field -> message (empty when all is fine).
function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Enter your full name.';
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Enter a valid email address, for example name@example.com. Or leave it empty.';
  }
  if (!form.district) errors.district = 'Choose your district.';
  if (!form.consent) errors.consent = 'Tick the consent box to continue.';
  return errors;
}

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { state } = useStore();
  const { setLang } = useLanguage();
  const phone = state.session.phone;
  const profile = state.citizens[phone]?.profile ?? null;

  // Pre-fill from the saved profile when the citizen is editing it.
  const [form, setForm] = useState(() => ({
    fullName: profile?.fullName ?? '',
    email: profile?.email ?? '',
    language: profile?.language ?? 'en',
    state: profile?.state ?? 'Telangana',
    district: profile?.district ?? '',
    consent: Boolean(profile?.consentGiven),
  }));
  const [errors, setErrors] = useState({});

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLanguageChange(code) {
    setField('language', code);
    // Switch the whole app to the chosen language straight away.
    setLang(code);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    storeActions.upsertProfile(phone, {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      language: form.language,
      state: form.state,
      district: form.district,
      consentGiven: true,
      consentAt: new Date().toISOString(),
    });
    setLang(form.language);

    // No family members yet: add them next. Otherwise go to the dashboard.
    const hasFamily = (state.citizens[phone]?.familyMembers ?? []).length > 0;
    navigate(hasFamily ? '/citizen/dashboard' : '/citizen/family');
  }

  const errorList = Object.values(errors);

  return (
    <CitizenLayout
      title="Your profile"
      helpSteps={[
        'Type your full name as it appears on your documents.',
        'Email is optional. Leave it empty if you do not have one.',
        'Choose your district and the language you want to read.',
        'Tick the consent box after reading it. Then press Save and continue.',
        'Your phone number is fixed because you logged in with it.',
      ]}
    >
      <div className="card">
        <p className="notice">
          The phone holder is the family account manager. One phone number can cover the whole family.
        </p>

        {errorList.length > 0 && (
          <div className="notice notice-error" role="alert">
            <p><strong>Please fix these:</strong></p>
            <ul>
              {errorList.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="verified-phone">Verified phone number</label>
            <input id="verified-phone" className="input" value={phone ?? ''} readOnly />
          </div>

          <div className="form-group">
            <label htmlFor="full-name">Full name (required)</label>
            <input
              id="full-name"
              className="input"
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'full-name-error' : undefined}
            />
            {errors.fullName && <p id="full-name-error" className="error-text">{errors.fullName}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (optional)</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && <p id="email-error" className="error-text">{errors.email}</p>}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="language">Preferred language</label>
              <select
                id="language"
                className="select"
                value={form.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="state">State</label>
              <select id="state" className="select" value={form.state} onChange={(e) => setField('state', e.target.value)}>
                <option value="Telangana">Telangana</option>
              </select>
              <p className="muted">More states can be added later.</p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="district">District (required)</label>
            <select
              id="district"
              className="select"
              value={form.district}
              onChange={(e) => setField('district', e.target.value)}
              aria-invalid={Boolean(errors.district)}
              aria-describedby={errors.district ? 'district-error' : undefined}
            >
              <option value="">Choose a district</option>
              {TELANGANA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {errors.district && <p id="district-error" className="error-text">{errors.district}</p>}
          </div>

          <div className="form-group">
            <label className="row" style={{ fontWeight: 400 }}>
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setField('consent', e.target.checked)}
                aria-invalid={Boolean(errors.consent)}
                aria-describedby={errors.consent ? 'consent-error' : undefined}
                style={{ width: 22, height: 22 }}
              />
              <span>
                I agree that SchemeSaathi stores my name, phone number, and family details only to find schemes I may
                qualify for. I understand that I am not asked for Aadhaar number.
              </span>
            </label>
            {errors.consent && <p id="consent-error" className="error-text">{errors.consent}</p>}
          </div>

          <button type="submit" className="btn btn-primary">
            Save and continue
          </button>
        </form>
      </div>
    </CitizenLayout>
  );
}
