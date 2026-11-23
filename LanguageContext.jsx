// Language state for the whole app: which language is picked, and a t() helper for text.
// The choice is saved in localStorage so it stays after a page reload.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { t as translate } from './translations.js';

const LANG_KEY = 'ss_lang';
const DEFAULT_LANG = 'en';
const SUPPORTED = ['en', 'te', 'hi'];

// Languages shown in the language picker. The labels are in each language's own script.
export const LANGUAGE_OPTIONS = [
  { code: 'te', label: 'తెలుగు' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
];

const LanguageContext = createContext(null);

function readSavedLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    return SUPPORTED.includes(saved) ? saved : DEFAULT_LANG;
  } catch {
    // Storage can be blocked in some browsers. Use the default.
    return DEFAULT_LANG;
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readSavedLang);

  const setLang = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLangState(next);
  }, []);

  // Save the choice and set the page language for screen readers.
  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Ignore storage errors: the choice just will not be remembered.
    }
    document.documentElement.lang = lang === 'en' ? 'en-IN' : lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key) => translate(lang, key),
    }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
