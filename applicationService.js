// Prototype: data lives in localStorage. Replace the body with backend API calls later; keep the function names and signatures.
import { getStoreState, storeActions } from '../lib/store.jsx';

export async function listApplications(phone) {
  return getStoreState().citizens[phone]?.applications ?? [];
}

export async function addApplication(phone, record) {
  // A new application can never start as officially verified.
  storeActions.addApplication(phone, { ...record, officialVerified: false });
  return { ok: true };
}

export async function updateApplication(phone, id, patch) {
  // Citizens cannot change officialVerified. Remove it from any patch before saving.
  const { officialVerified, ...safePatch } = patch || {};
  storeActions.updateApplication(phone, id, safePatch);
  return { ok: true };
}

// Only the admin settings screen should call this. The citizen UI must never set officialVerified to true.
export async function setOfficialVerified(id, value) {
  storeActions.setApplicationOfficialVerified(id, Boolean(value));
  return { ok: true };
}
