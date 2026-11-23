// Admin login page. Checks the form first, then calls adminLogin() from authService.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../components/Layout.jsx';
import { useStore } from '../lib/store.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { adminLogin } from '../services/authService.js';

// Remember me only stores the email address (never the password), in this browser.
const REMEMBER_KEY = 'ss_admin_remember_email';

function readRememberedEmail() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) || '';
  } catch {
    return '';
  }
}

function saveRememberedEmail(email) {
  try {
    if (email) window.localStorage.setItem(REMEMBER_KEY, email);
    else window.localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // Storage blocked: the choice is just not remembered.
  }
}

// Simple email shape check. The real check happens on the backend.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { state } = useStore();
  const { t } = useLanguage();

  const [email, setEmail] = useState(readRememberedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => Boolean(readRememberedEmail()));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forgot-password dialog state.
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // Already signed in as admin: go straight to the schemes page.
  if (state.session.role === 'admin') {
    return <Navigate to="/admin/schemes" replace />;
  }

  // Check the form before calling the service. Returns a map of field name to message.
  function validate() {
    const found = {};
    if (!email.trim()) found.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(email.trim())) found.email = 'Enter a valid email address.';
    if (!password) found.password = 'Enter your password.';
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const result = await adminLogin(email.trim(), password);
    setSubmitting(false);

    if (!result.ok) {
      setServerError(t(result.error) || 'Login failed. Please try again.');
      return;
    }
    saveRememberedEmail(remember ? email.trim() : '');
    navigate('/admin/schemes', { replace: true });
  }

  function handleSendReset(event) {
    event.preventDefault();
    setResetError('');
    setResetMessage('');
    if (!EMAIL_PATTERN.test(resetEmail.trim())) {
      setResetError('Enter a valid email address.');
      return;
    }
    // Prototype: no email is sent.
    setResetMessage('If this email is registered, reset instructions would be sent. (Prototype: no email is sent.)');
  }

  return (
    <PublicLayout>
      <div className="container" style={{ maxWidth: 480, padding: 0 }}>
        <h1 style={{ marginTop: 16 }}>Government Admin Login</h1>

        <div className="notice notice-demo" role="note">
          <strong>DEMO ACCOUNT - not an officially verified government account.</strong>
          <br />
          Email: admin.demo@schemesaathi.example
          <br />
          Password: Demo@12345
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'admin-email-error' : undefined}
              />
              {errors.email && (
                <p id="admin-email-error" className="error-text">{errors.email}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">Password</label>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input
                  id="admin-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'admin-password-error' : undefined}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  Show password
                </button>
              </div>
              {errors.password && (
                <p id="admin-password-error" className="error-text">{errors.password}</p>
              )}
            </div>

            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                id="admin-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
              <label htmlFor="admin-remember">Remember me on this device (email only)</label>
            </div>

            {serverError && (
              <p className="error-text" role="alert">{serverError}</p>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-ghost"
              aria-haspopup="dialog"
              aria-expanded={resetOpen}
              onClick={() => {
                setResetOpen(true);
                setResetMessage('');
                setResetError('');
              }}
            >
              Forgot password?
            </button>
          </p>
        </div>

        {resetOpen && (
          <div className="modal-backdrop" onClick={() => setResetOpen(false)}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-title"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setResetOpen(false);
              }}
            >
              <h2 id="reset-title">Reset password</h2>
              <form onSubmit={handleSendReset} noValidate>
                <div className="form-group">
                  <label htmlFor="reset-email">Email</label>
                  <input
                    id="reset-email"
                    className="input"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    aria-invalid={Boolean(resetError)}
                  />
                  {resetError && <p className="error-text">{resetError}</p>}
                </div>
                {resetMessage && <p className="notice" role="status">{resetMessage}</p>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setResetOpen(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Send reset link
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
