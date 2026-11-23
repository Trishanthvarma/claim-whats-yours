// Data store for the prototype: one place where all app data lives, saved in localStorage.
//
// Design:
// - The state is a plain object. Changes only happen through the actions exported below.
// - StoreProvider and useStore() are for React components.
// - The service files (src/services/*.js) are plain functions, so they import storeActions
//   and getStoreState directly from this file.
//
// Prototype only: when the backend exists, these actions will be replaced by API calls.

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { buildSeedSchemes, SEED_CITIZENS, SEED_APPLICATIONS, SEED_NOTIFICATIONS } from '../data/sampleData.js';

const STORAGE_KEY = 'ss_store_v1';

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankCitizen(phone) {
  return { phone, profile: null, familyMembers: [], applications: [], notifications: [], checklist: {} };
}

// The starting data: demo schemes, demo citizens with their applications and notifications.
function buildInitialState() {
  const citizens = {};
  for (const seed of SEED_CITIZENS) {
    citizens[seed.phone] = {
      phone: seed.phone,
      profile: seed.profile,
      familyMembers: seed.familyMembers,
      applications: SEED_APPLICATIONS.filter((a) => a.phone === seed.phone),
      notifications: SEED_NOTIFICATIONS.filter((n) => n.phone === seed.phone),
      checklist: {},
    };
  }
  const schemes = buildSeedSchemes();
  return {
    schemes,
    citizens,
    session: { role: null, phone: null },
    adminLog: [],
    customSchemes: schemes.filter((s) => !s.isDemo),
  };
}

function isValidState(value) {
  return (
    value &&
    typeof value === 'object' &&
    Array.isArray(value.schemes) &&
    value.citizens &&
    typeof value.citizens === 'object' &&
    value.session &&
    Array.isArray(value.adminLog)
  );
}

function loadState() {
  if (typeof window === 'undefined') return buildInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialState();
    const parsed = JSON.parse(raw);
    return isValidState(parsed) ? parsed : buildInitialState();
  } catch {
    // Corrupt or blocked storage: start again from the seed data.
    return buildInitialState();
  }
}

function persist(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the app keeps working for this visit only.
  }
}

// Change one citizen record. Returns the same state if the phone is unknown.
function updateCitizen(state, phone, change) {
  const citizen = state.citizens[phone];
  if (!citizen) return state;
  return { ...state, citizens: { ...state.citizens, [phone]: change(citizen) } };
}

// All changes to the data happen in this reducer.
function reducer(state, action) {
  switch (action.type) {
    case 'ADMIN_LOGIN':
      return { ...state, session: { role: 'admin', phone: null } };

    case 'LOGOUT':
      return { ...state, session: { role: null, phone: null } };

    case 'CITIZEN_LOGIN': {
      const citizens = state.citizens[action.phone]
        ? state.citizens
        : { ...state.citizens, [action.phone]: blankCitizen(action.phone) };
      return { ...state, citizens, session: { role: 'citizen', phone: action.phone } };
    }

    case 'UPSERT_PROFILE':
      return updateCitizen(state, action.phone, (c) => ({
        ...c,
        profile: { ...(c.profile || {}), ...action.profile, phone: action.phone },
      }));

    case 'ADD_MEMBER':
      return updateCitizen(state, action.phone, (c) => ({
        ...c,
        familyMembers: [...c.familyMembers, { ...action.member, id: action.member.id || newId('MEM') }],
      }));

    case 'UPDATE_MEMBER':
      return updateCitizen(state, action.phone, (c) => ({
        ...c,
        familyMembers: c.familyMembers.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
      }));

    case 'DELETE_MEMBER':
      return updateCitizen(state, action.phone, (c) => ({
        ...c,
        familyMembers: c.familyMembers.filter((m) => m.id !== action.id),
      }));

    case 'SAVE_SCHEME': {
      const scheme = { ...action.scheme, lastUpdated: new Date().toISOString() };
      const exists = state.schemes.some((s) => s.id === scheme.id);
      const schemes = exists
        ? state.schemes.map((s) => (s.id === scheme.id ? scheme : s))
        : [...state.schemes, scheme];
      return { ...state, schemes, customSchemes: schemes.filter((s) => !s.isDemo) };
    }

    case 'ARCHIVE_SCHEME': {
      const schemes = state.schemes.map((s) =>
        s.id === action.id ? { ...s, archived: true, status: 'closed', lastUpdated: new Date().toISOString() } : s
      );
      return { ...state, schemes, customSchemes: schemes.filter((s) => !s.isDemo) };
    }

    case 'SET_SCHEME_STATUS': {
      const schemes = state.schemes.map((s) =>
        s.id === action.id ? { ...s, status: action.status, lastUpdated: new Date().toISOString() } : s
      );
      return { ...state, schemes, customSchemes: schemes.filter((s) => !s.isDemo) };
    }

    case 'ADD_APPLICATION':
      return updateCitizen(state, action.phone, (c) => ({
        ...c,
        applications: [
          ...c.applications,
          { ...action.record, id: action.record.id || newId('APP'), officialVerified: false },
        ],
      }));

    case 'UPDATE_APPLICATION':
      return updateCitizen(state, action.phone, (c) => ({
        ...c,
        // officialVerified can never be changed here. Only SET_APPLICATION_OFFICIAL_VERIFIED can.
        applications: c.applications.map((a) => {
          if (a.id !== action.id) return a;
          const { officialVerified, ...safePatch } = action.patch;
          return { ...a, ...safePatch };
        }),
      }));

    case 'SET_APPLICATION_OFFICIAL_VERIFIED': {
      const citizens = {};
      for (const [phone, c] of Object.entries(state.citizens)) {
        citizens[phone] = {
          ...c,
          applications: c.applications.map((a) =>
            a.id === action.id ? { ...a, officialVerified: action.value } : a
          ),
        };
      }
      return { ...state, citizens };
    }

    case 'ADD_NOTIFICATION':
      return updateCitizen(state, action.phone, (c) => {
        // Same key = same message. Do not add it twice.
        if (c.notifications.some((n) => n.key === action.notification.key)) return c;
        return {
          ...c,
          notifications: [
            { ...action.notification, id: action.notification.id || newId('NOT'), read: false, createdAt: new Date().toISOString() },
            ...c.notifications,
          ],
        };
      });

    case 'MARK_NOTIFICATION_READ':
      return updateCitizen(state, action.phone, (c) => ({
        ...c,
        notifications: c.notifications.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
      }));

    case 'MARK_ALL_READ':
      return updateCitizen(state, action.phone, (c) => ({
        ...c,
        notifications: c.notifications.map((n) => ({ ...n, read: true })),
      }));

    case 'ADD_ADMIN_LOG':
      return {
        ...state,
        adminLog: [{ ...action.entry, at: new Date().toISOString() }, ...state.adminLog].slice(0, 200),
      };

    case 'RESET_DEMO_DATA':
      return buildInitialState();

    case 'DELETE_CITIZEN_DATA': {
      const citizens = { ...state.citizens };
      delete citizens[action.phone];
      const session = state.session.phone === action.phone ? { role: null, phone: null } : state.session;
      return { ...state, citizens, session };
    }

    default:
      return state;
  }
}

// Module-level store. Shared by React (via StoreProvider) and by the service files.
let currentState = loadState();
const listeners = new Set();

function dispatch(action) {
  const next = reducer(currentState, action);
  if (next === currentState) return;
  currentState = next;
  persist(currentState);
  listeners.forEach((fn) => fn());
}

export function getStoreState() {
  return currentState;
}

export function subscribeStore(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Keep several browser tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    currentState = loadState();
    listeners.forEach((fn) => fn());
  });
}

// Every data change the app can make. Components and services call these.
export const storeActions = {
  adminLogin: () => dispatch({ type: 'ADMIN_LOGIN' }),
  logout: () => dispatch({ type: 'LOGOUT' }),
  citizenLogin: (phone) => dispatch({ type: 'CITIZEN_LOGIN', phone }),
  citizenLogout: () => dispatch({ type: 'LOGOUT' }),
  upsertProfile: (phone, profile) => dispatch({ type: 'UPSERT_PROFILE', phone, profile }),
  addMember: (phone, member) => dispatch({ type: 'ADD_MEMBER', phone, member }),
  updateMember: (phone, id, patch) => dispatch({ type: 'UPDATE_MEMBER', phone, id, patch }),
  deleteMember: (phone, id) => dispatch({ type: 'DELETE_MEMBER', phone, id }),
  saveScheme: (scheme) => dispatch({ type: 'SAVE_SCHEME', scheme }),
  archiveScheme: (id) => dispatch({ type: 'ARCHIVE_SCHEME', id }),
  setSchemeStatus: (id, status) => dispatch({ type: 'SET_SCHEME_STATUS', id, status }),
  addApplication: (phone, record) => dispatch({ type: 'ADD_APPLICATION', phone, record }),
  updateApplication: (phone, id, patch) => dispatch({ type: 'UPDATE_APPLICATION', phone, id, patch }),
  setApplicationOfficialVerified: (id, value) =>
    dispatch({ type: 'SET_APPLICATION_OFFICIAL_VERIFIED', id, value: Boolean(value) }),
  addNotification: (phone, notification) => dispatch({ type: 'ADD_NOTIFICATION', phone, notification }),
  markNotificationRead: (phone, id) => dispatch({ type: 'MARK_NOTIFICATION_READ', phone, id }),
  markAllRead: (phone) => dispatch({ type: 'MARK_ALL_READ', phone }),
  addAdminLog: (entry) => dispatch({ type: 'ADD_ADMIN_LOG', entry }),
  resetDemoData: () => dispatch({ type: 'RESET_DEMO_DATA' }),
  deleteCitizenData: (phone) => dispatch({ type: 'DELETE_CITIZEN_DATA', phone }),
};

// ---------- React wiring ----------

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const state = useSyncExternalStore(subscribeStore, getStoreState);
  const value = useMemo(() => ({ state, actions: storeActions }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/**
 * Returns { state, actions }. Must be used inside StoreProvider.
 */
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
