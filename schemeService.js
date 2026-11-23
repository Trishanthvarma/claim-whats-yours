// Prototype: data lives in localStorage. Replace the body with backend API calls later; keep the function names and signatures.
import { getStoreState, storeActions } from '../lib/store.jsx';

export async function listSchemes() {
  return getStoreState().schemes;
}

export async function getScheme(id) {
  return getStoreState().schemes.find((s) => s.id === id) ?? null;
}

export async function saveScheme(scheme) {
  storeActions.saveScheme(scheme);
  return { ok: true };
}

export async function setStatus(id, status) {
  storeActions.setSchemeStatus(id, status);
  return { ok: true };
}

export async function archive(id) {
  storeActions.archiveScheme(id);
  return { ok: true };
}
