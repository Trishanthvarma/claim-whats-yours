// Prototype: data lives in localStorage. Replace the body with backend API calls later; keep the function names and signatures.
// Login here is FAKE. It is only good enough to demonstrate the screens.
import { storeActions } from '../lib/store.jsx';

// DEMO ONLY: this admin login is hard-coded for the prototype so the demo can be opened.
// The real check will be Firebase Auth on the backend. Passwords must never be stored in
// the app, in localStorage, or in code that ships to users. Remove this when the backend exists.
const DEMO_ADMIN_EMAIL = 'admin.demo@schemesaathi.example';
const DEMO_ADMIN_PASSWORD = 'Demo@12345';

// DEMO ONLY: a fixed OTP. The real OTP will be sent by SMS from the backend/Firebase Auth.
const DEMO_OTP = '123456';

const MAX_WRONG_ATTEMPTS = 3;
const LOCK_MS = 60 * 1000;

// Wrong-attempt counts per phone. Kept in memory, so a page reload clears the lock (prototype only).
const otpAttempts = new Map();

// Accept 10 digit Indian mobile numbers (starting 6 to 9), with or without +91 or spaces.
function normalizePhone(input) {
  const digits = String(input || '').replace(/\D/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (ten.length !== 10 || !/^[6-9]/.test(ten)) return null;
  return `+91${ten}`;
}

export async function adminLogin(email, password) {
  // Compare the typed values with the demo values. Nothing is stored.
  if (String(email).trim().toLowerCase() === DEMO_ADMIN_EMAIL && password === DEMO_ADMIN_PASSWORD) {
    storeActions.adminLogin();
    return { ok: true };
  }
  return { ok: false, error: 'errorInvalidCredentials' };
}

export async function citizenSendOtp(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, error: 'errorInvalidPhone' };
  // Prototype: nothing is sent. The demo code is 123456.
  return { ok: true, phone: normalized };
}

export async function citizenVerifyOtp(phone, code) {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, error: 'errorInvalidPhone' };

  const now = Date.now();
  const entry = otpAttempts.get(normalized) || { wrong: 0, lockedUntil: 0 };

  // Still locked from earlier wrong attempts?
  if (entry.lockedUntil > now) {
    return { ok: false, error: 'errorOtpLocked', retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }

  if (String(code).trim() === DEMO_OTP) {
    otpAttempts.delete(normalized);
    storeActions.citizenLogin(normalized);
    return { ok: true };
  }

  // Wrong code: count it. After 3 wrong codes, lock for 60 seconds.
  const wrong = entry.wrong + 1;
  if (wrong >= MAX_WRONG_ATTEMPTS) {
    otpAttempts.set(normalized, { wrong: 0, lockedUntil: now + LOCK_MS });
    return { ok: false, error: 'errorOtpLocked', retryAfterSeconds: LOCK_MS / 1000 };
  }
  otpAttempts.set(normalized, { wrong, lockedUntil: 0 });
  return { ok: false, error: 'errorInvalidOtp', attemptsLeft: MAX_WRONG_ATTEMPTS - wrong };
}

export async function adminLogout() {
  storeActions.logout();
  return { ok: true };
}

export async function citizenLogout() {
  storeActions.citizenLogout();
  return { ok: true };
}
