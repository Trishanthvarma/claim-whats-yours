// Citizen login: enter a mobile number, ask for an OTP, then type the OTP to log in.
// Prototype only: the OTP is fixed (123456). The real OTP will come from Firebase Phone Authentication.
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../components/Layout.jsx';
import { useStore, getStoreState } from '../lib/store.jsx';
import { citizenSendOtp, citizenVerifyOtp } from '../services/authService.js';

const RESEND_SECONDS = 30;
const OTP_RE = /^\d{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Only India (+91) is supported by the prototype's phone check.
const COUNTRY_CODES = [{ code: '+91', label: 'India (+91)' }];

// Check the 10-digit mobile number. Returns an error message, or '' when it is fine.
function validatePhone(value) {
  if (!value) return 'Enter your 10-digit mobile number.';
  if (!/^\d+$/.test(value)) return 'Use digits only (0-9). No spaces or symbols.';
  if (value.length !== 10) return 'The mobile number must be exactly 10 digits.';
  if (!/^[6-9]/.test(value)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
  return '';
}

// After login: a citizen with a finished profile goes to the dashboard, others to profile setup.
function destinationFor(phone) {
  const citizen = getStoreState().citizens[phone];
  return citizen?.profile?.fullName ? '/citizen/dashboard' : '/citizen/profile-setup';
}

export default function CitizenLoginPage() {
  const navigate = useNavigate();
  const { state } = useStore();
  const { session } = state;

  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sentPhone, setSentPhone] = useState(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Timestamps (ms). The countdowns are computed from these, so a reload does not change them.
  const [resendUntil, setResendUntil] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const countdownRunning = resendUntil > now || lockUntil > now;

  // While a countdown runs, refresh "now" once a second so the labels count down.
  useEffect(() => {
    if (!countdownRunning) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [countdownRunning]);

  const resendLeft = Math.max(0, Math.ceil((resendUntil - now) / 1000));
  const lockLeft = Math.max(0, Math.ceil((lockUntil - now) / 1000));
  const locked = lockLeft > 0;

  // Already logged in as a citizen? Send them on to the right page.
  if (session.role === 'citizen' && session.phone) {
    return <Navigate to={destinationFor(session.phone)} replace />;
  }

  // Start the 30-second resend countdown.
  function startResendTimer() {
    const current = Date.now();
    setNow(current);
    setResendUntil(current + RESEND_SECONDS * 1000);
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    setError('');
    const problem = validatePhone(phone);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    const result = await citizenSendOtp(countryCode + phone);
    setBusy(false);
    if (!result.ok) {
      setError(result.error === 'errorInvalidPhone' ? 'Enter a valid 10-digit mobile number.' : 'Could not send the OTP. Try again.');
      return;
    }
    setSentPhone(result.phone);
    setOtpSent(true);
    setOtp('');
    startResendTimer();
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError('');
    if (locked) return;
    if (!OTP_RE.test(otp.trim())) {
      setError('Enter the 6-digit code. Digits only.');
      return;
    }
    setBusy(true);
    const result = await citizenVerifyOtp(sentPhone, otp.trim());
    setBusy(false);
    if (result.ok) {
      // Logged in. Go to the next page for this citizen.
      navigate(destinationFor(sentPhone), { replace: true });
      return;
    }
    if (result.error === 'errorOtpLocked') {
      const seconds = result.retryAfterSeconds ?? 60;
      setLockUntil(Date.now() + seconds * 1000);
      setNow(Date.now());
      setError(`Too many wrong attempts. Wait ${seconds} seconds before trying again.`);
      return;
    }
    if (result.error === 'errorInvalidOtp') {
      const left = result.attemptsLeft ?? 0;
      setError(`The code is incorrect. ${left} attempt${left === 1 ? '' : 's'} left before a 60-second lock.`);
      return;
    }
    setError('Could not verify the code. Try again.');
  }

  async function handleResend() {
    if (resendLeft > 0 || !sentPhone) return;
    setError('');
    setBusy(true);
    const result = await citizenSendOtp(sentPhone);
    setBusy(false);
    if (!result.ok) {
      setError('Could not send the OTP again. Try again.');
      return;
    }
    setOtp('');
    startResendTimer();
  }

  // Changing the number starts again from the first step.
  function handlePhoneChange(value) {
    setPhone(value);
    setOtpSent(false);
    setSentPhone(null);
    setOtp('');
    setError('');
  }

  return (
    <PublicLayout>
      <main className="container">
        <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
          <h1>Citizen login</h1>
          <p className="notice notice-demo">
            Demo only - the OTP is 123456. Real SMS OTP will come from Firebase Phone Authentication.
          </p>

          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}

          <form onSubmit={handleSendOtp} noValidate>
            <div className="form-group">
              <label htmlFor="country-code">Country code</label>
              <select
                id="country-code"
                className="select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="mobile">Mobile number (10 digits)</label>
              <input
                id="mobile"
                className="input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                disabled={otpSent}
              />
            </div>

            {!otpSent && (
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Send OTP
              </button>
            )}
          </form>

          {otpSent && (
            <form onSubmit={handleVerifyOtp} noValidate>
              <p className="muted">A code was sent to {sentPhone} (demo: no SMS is sent).</p>

              <div className="form-group">
                <label htmlFor="otp">6-digit OTP</label>
                <input
                  id="otp"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={locked}
                />
              </div>

              {locked && (
                <p className="notice notice-error" role="status">
                  Locked. You can try again in {lockLeft} seconds.
                </p>
              )}

              <div className="row">
                <button type="submit" className="btn btn-primary" disabled={busy || locked}>
                  Verify OTP
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResend}
                  disabled={resendLeft > 0 || busy}
                >
                  {resendLeft > 0 ? `Resend in ${resendLeft}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </PublicLayout>
  );
}
