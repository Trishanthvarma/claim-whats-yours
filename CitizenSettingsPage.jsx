// Citizen settings page: edit profile, choose language, log out, and delete all local citizen data.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CitizenLayout } from '../components/Layout.jsx';
import { useStore } from '../lib/store.jsx';
import { useLanguage, LANGUAGE_OPTIONS } from '../i18n/LanguageContext.jsx';
import { TELANGANA_DISTRICTS } from '../data/sampleData.js';
import { citizenLogout } from '../services/authService.js';

// A simple email check: something@something.something, with no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HELP_STEPS = [
  'Edit your name, email, district and language here, then press Save profile.',
  'Your phone number is verified at login and cannot be changed here.',
  'Changing the language changes the whole site straight away.',
  'Log out to leave the portal. Your data stays on this device.',
  'Delete my data removes your profile, family and application records from this device. This cannot be undone.',
];

export default function CitizenSettingsPage() {
  const navigate = useNavigate();
  const { state, actions } = useStore();
  const { lang, setLang } = useLanguage();

  // The verified phone number for the logged-in citizen. Empty if nobody is logged in.
  const phone = state.session?.phone || null;

  // The saved profile for this phone. Use an empty object if there is none yet.
  const existingProfile = (phone && state.citizens?.[phone]?.profile) || {};

  // Form fields, pre-filled from the saved profile.
  const [fullName, setFullName] = useState(existingProfile.fullName || '');
  const [email, setEmail] = useState(existingProfile.email || '');
  const [district, setDistrict] = useState(existingProfile.district || '');
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(false);

  // Validate the form. Returns a list of messages (empty list means all good).
  function validate() {
    const problems = [];
    if (!fullName.trim()) problems.push('Please enter your full name.');
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      problems.push('Please enter a valid email address, or leave it empty.');
    }
    return problems;
  }

  // Save the profile. The language always comes from the shared lang value, so the
  // profile select and the Language section can never disagree.
  function handleSave(e) {
    e.preventDefault();
    const problems = validate();
    setErrors(problems);
    if (problems.length > 0) {
      setSaved(false);
      return;
    }
    if (!phone) return;
    actions.upsertProfile(phone, {
      ...existingProfile,
      fullName: fullName.trim(),
      email: email.trim(),
      district,
      language: lang,
      state: existingProfile.state || 'Telangana',
    });
    setSaved(true);
  }

  // Changing the language switches the whole site right away.
  function handleLanguageChange(code) {
    setLang(code);
    setSaved(false);
  }

  // Log out, then go to the home page.
  async function handleLogout() {
    await citizenLogout();
    navigate('/');
  }

  // Ask first, then delete everything this citizen saved on this device.
  function handleDeleteData() {
    if (!phone) return;
    const confirmed = window.confirm(
      'This deletes all your profile, family and application records on this device. This cannot be undone.'
    );
    if (!confirmed) return;
    actions.deleteCitizenData(phone);
    navigate('/');
  }

  // No phone in the session: the citizen must log in again.
  if (!phone) {
    return (
      <CitizenLayout title="Settings" helpSteps={HELP_STEPS}>
        <div className="card">
          <p>Please log in again.</p>
          <Link to="/citizen/login">Go to login</Link>
        </div>
      </CitizenLayout>
    );
  }

  return (
    <CitizenLayout title="Settings" helpSteps={HELP_STEPS}>
      {/* Section 1: edit profile */}
      <section className="card">
        <h2>Edit profile</h2>
        <form onSubmit={handleSave} noValidate>
          <div className="form-group">
            <label htmlFor="settings-name">Full name (required)</label>
            <input
              id="settings-name"
              className="input"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setSaved(false);
              }}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="settings-email">Email (optional)</label>
            <input
              id="settings-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSaved(false);
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="settings-phone">Verified phone (cannot be changed)</label>
            <input id="settings-phone" className="input" type="text" value={phone} readOnly />
          </div>

          <div className="form-group">
            <label htmlFor="settings-language">Preferred language</label>
            <select
              id="settings-language"
              className="select"
              aria-label="Preferred language"
              value={lang}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="settings-district">District</label>
            <select
              id="settings-district"
              className="select"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setSaved(false);
              }}
            >
              <option value="">Select a district</option>
              {TELANGANA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {errors.length > 0 && (
            <div role="alert">
              {errors.map((msg) => (
                <p key={msg} className="error-text">
                  {msg}
                </p>
              ))}
            </div>
          )}

          {saved && <p className="notice">Your profile is saved.</p>}

          <button type="submit" className="btn btn-primary">
            Save profile
          </button>
        </form>
      </section>

      {/* Section 2: language (same shared value as the profile select above) */}
      <section className="card">
        <h2>Language</h2>
        <div className="form-group">
          <select
            className="select"
            aria-label="Choose language"
            value={lang}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Section 3: log out */}
      <section className="card">
        <h2>Log out</h2>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Log out
        </button>
      </section>

      {/* Section 4: delete data */}
      <section className="card">
        <h2>Delete my data</h2>
        <p>
          This removes your profile, family and application records from this device. It cannot be undone.
        </p>
        <button type="button" className="btn btn-danger" onClick={handleDeleteData}>
          Delete my data
        </button>
      </section>
    </CitizenLayout>
  );
}
