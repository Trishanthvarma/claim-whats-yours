// Eligibility rules for SchemeSaathi.
// This file is pure, rule-based logic. NO AI is used here: the AI never decides eligibility.
// Note: this logic will move to the backend later. Keep the output shape stable so the UI does not change.
//
// Note for callers: pass a member object that already has `district` (copied from the profile),
// because district is kept on the profile, not on each family member.

import { translations } from '../i18n/translations.js';

export const ELIGIBILITY_STATUS = {
  LIKELY: 'Likely eligible',
  MORE_INFO: 'More information required',
  NOT_MATCHING: 'Not matching current conditions',
  CLOSED: 'Scheme closed',
  VERIFY: 'Awaiting official verification',
};

// Order used when showing lists: best news first.
const STATUS_ORDER = [
  ELIGIBILITY_STATUS.LIKELY,
  ELIGIBILITY_STATUS.MORE_INFO,
  ELIGIBILITY_STATUS.VERIFY,
  ELIGIBILITY_STATUS.NOT_MATCHING,
  ELIGIBILITY_STATUS.CLOSED,
];

function isSet(value) {
  return value !== null && value !== undefined && value !== '';
}

// Compare two text values without caring about case or extra spaces.
function sameText(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

// Each check returns null (rule not used for this scheme) or { label, result, detail }.
// result is "met", "not_met" or "missing".

function checkAge(eligibility, member) {
  const { ageMin, ageMax } = eligibility;
  if (!isSet(ageMin) && !isSet(ageMax)) return null;
  const range = `${isSet(ageMin) ? ageMin : 'any'} to ${isSet(ageMax) ? ageMax : 'any'} years`;
  if (!isSet(member.age)) {
    return { label: 'Age', result: 'missing', detail: `Age is not entered. Scheme needs ${range}.` };
  }
  const ok = (!isSet(ageMin) || member.age >= ageMin) && (!isSet(ageMax) || member.age <= ageMax);
  return ok
    ? { label: 'Age', result: 'met', detail: `Age ${member.age} is within ${range}.` }
    : { label: 'Age', result: 'not_met', detail: `Age ${member.age} is outside ${range}.` };
}

function checkIncome(eligibility, member) {
  const { incomeMax } = eligibility;
  if (!isSet(incomeMax)) return null;
  if (!isSet(member.familyIncome)) {
    return { label: 'Family income', result: 'missing', detail: 'Family income is not entered.' };
  }
  return member.familyIncome <= incomeMax
    ? { label: 'Family income', result: 'met', detail: `Family income is within Rs. ${incomeMax} a year.` }
    : { label: 'Family income', result: 'not_met', detail: `Family income is above Rs. ${incomeMax} a year.` };
}

function checkOccupation(eligibility, member) {
  const { occupations } = eligibility;
  if (!Array.isArray(occupations) || occupations.length === 0) return null;
  if (!isSet(member.occupation)) {
    return { label: 'Occupation', result: 'missing', detail: 'Occupation is not entered.' };
  }
  const ok = occupations.some((o) => sameText(o, member.occupation));
  return ok
    ? { label: 'Occupation', result: 'met', detail: `Occupation ${member.occupation} is listed.` }
    : { label: 'Occupation', result: 'not_met', detail: `Scheme is for: ${occupations.join(', ')}.` };
}

function checkEducation(eligibility, member) {
  const { educations } = eligibility;
  if (!Array.isArray(educations) || educations.length === 0) return null;
  if (!isSet(member.education)) {
    return { label: 'Education', result: 'missing', detail: 'Education level is not entered.' };
  }
  const ok = educations.some((e) => sameText(e, member.education));
  return ok
    ? { label: 'Education', result: 'met', detail: `Education level ${member.education} is listed.` }
    : { label: 'Education', result: 'not_met', detail: `Scheme needs one of: ${educations.join(', ')}.` };
}

function checkState(eligibility, member) {
  if (!isSet(eligibility.state)) return null;
  if (!isSet(member.state)) {
    return { label: 'State', result: 'missing', detail: 'State is not entered.' };
  }
  return sameText(member.state, eligibility.state)
    ? { label: 'State', result: 'met', detail: `Living in ${eligibility.state}.` }
    : { label: 'State', result: 'not_met', detail: `Scheme is only for ${eligibility.state}.` };
}

function checkDistrict(eligibility, member) {
  const { districts } = eligibility;
  if (!Array.isArray(districts) || districts.length === 0) return null;
  if (!isSet(member.district)) {
    return { label: 'District', result: 'missing', detail: 'District is not entered in profile.' };
  }
  const ok = districts.some((d) => sameText(d, member.district));
  return ok
    ? { label: 'District', result: 'met', detail: `District ${member.district} is covered.` }
    : { label: 'District', result: 'not_met', detail: `Scheme covers only: ${districts.join(', ')}.` };
}

function checkLandholding(eligibility, member) {
  const { landholdingMaxAcres } = eligibility;
  if (!isSet(landholdingMaxAcres)) return null;
  if (member.landholdingAcres === undefined || member.landholdingAcres === null) {
    return { label: 'Land holding', result: 'missing', detail: 'Land holding is not entered.' };
  }
  return member.landholdingAcres <= landholdingMaxAcres
    ? { label: 'Land holding', result: 'met', detail: `Land holding is within ${landholdingMaxAcres} acres.` }
    : { label: 'Land holding', result: 'not_met', detail: `Land holding is more than ${landholdingMaxAcres} acres.` };
}

function checkGender(eligibility, member) {
  const { gender } = eligibility;
  if (!isSet(gender)) return null;
  if (!isSet(member.gender)) {
    return { label: 'Gender', result: 'missing', detail: 'Gender is not entered.' };
  }
  return sameText(member.gender, gender)
    ? { label: 'Gender', result: 'met', detail: `Gender matches the scheme (${gender}).` }
    : { label: 'Gender', result: 'not_met', detail: `Scheme is for ${gender} applicants.` };
}

// True when "today" is between startDate and endDate (inclusive). Missing dates count as open.
function isInDateWindow(scheme, today) {
  const now = today.getTime();
  const start = Date.parse(scheme.startDate);
  const end = Date.parse(scheme.endDate);
  if (!Number.isNaN(start) && now < start) return false;
  if (!Number.isNaN(end) && now > end) return false;
  return true;
}

/**
 * Check one scheme against one family member.
 * Returns { status, rules, reasons }.
 */
export function evaluateSchemeForMember(scheme, member, today = new Date()) {
  const m = member || {};
  const eligibility = scheme.eligibility || {};

  const checks = [
    checkAge(eligibility, m),
    checkIncome(eligibility, m),
    checkOccupation(eligibility, m),
    checkEducation(eligibility, m),
    checkState(eligibility, m),
    checkDistrict(eligibility, m),
    checkLandholding(eligibility, m),
    checkGender(eligibility, m),
  ].filter(Boolean);

  // Plain sentences for every rule that is not met.
  const reasons = checks
    .filter((c) => c.result !== 'met')
    .map((c) => `${c.label}: ${c.detail}`);

  // Overall status, in priority order.
  let status;
  if (scheme.status !== 'published' || !isInDateWindow(scheme, today)) {
    status = ELIGIBILITY_STATUS.CLOSED;
    reasons.unshift('This scheme is closed or outside its application dates.');
  } else if (scheme.verificationStatus !== 'verified') {
    status = ELIGIBILITY_STATUS.VERIFY;
    reasons.unshift('Official verification of this scheme is still pending.');
  } else if (checks.some((c) => c.result === 'not_met')) {
    status = ELIGIBILITY_STATUS.NOT_MATCHING;
  } else if (checks.some((c) => c.result === 'missing')) {
    status = ELIGIBILITY_STATUS.MORE_INFO;
  } else {
    status = ELIGIBILITY_STATUS.LIKELY;
    reasons.push('All checked conditions match the details entered.');
  }

  return { status, rules: checks, reasons };
}

/**
 * Check every scheme for one member. Returns an array of { scheme, status, rules, reasons },
 * sorted by status priority (most helpful first).
 */
export function evaluateAllForMember(schemes, member, today = new Date()) {
  return schemes
    .map((scheme) => ({ scheme, ...evaluateSchemeForMember(scheme, member, today) }))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
}

/**
 * Translate a status name for display. Falls back to English, then to the raw text.
 */
export function statusLabel(status, lang = 'en') {
  const mapped = translations[lang]?.status?.[status];
  return mapped || translations.en.status[status] || status;
}
