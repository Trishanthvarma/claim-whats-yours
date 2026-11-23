// Prototype: data lives in localStorage. Replace the body with backend API calls later; keep the function names and signatures.
import { getStoreState, storeActions } from '../lib/store.jsx';

export async function listMembers(phone) {
  return getStoreState().citizens[phone]?.familyMembers ?? [];
}

export async function addMember(phone, member) {
  storeActions.addMember(phone, member);
  return { ok: true };
}

export async function updateMember(phone, id, patch) {
  storeActions.updateMember(phone, id, patch);
  return { ok: true };
}

export async function deleteMember(phone, id) {
  storeActions.deleteMember(phone, id);
  return { ok: true };
}
