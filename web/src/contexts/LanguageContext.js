/**
 * LanguageContext — public-website i18n provider.
 * ──────────────────────────────────────────────────────────────────────────
 * Scope: ONLY the public landing pages (LandingPage / LandingPageLight,
 * MobileCabinetSection, FinalCTA, Footer, Header nav). Cabinets / dashboards
 * deliberately untouched — they speak product-domain language that hasn't
 * been audited for translation yet.
 *
 * Strategy:
 *   • `lang` ∈ {'en', 'uk'} — defaults to 'en', persisted in localStorage
 *   • `t(key, fallback)`     — returns translation or the English fallback
 *     (so a missing key NEVER prints `key.path.broken` in the UI).
 *   • Dictionary lives in `./dictionary.js`.
 */
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { DICTIONARY, LANG_KEY, LANGS } from '@/i18n/dictionary';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (_k, fallback) => fallback,
  tByEn: (en) => en,
  languages: LANGS,
});

export { LanguageContext };

export const useLang = () => useContext(LanguageContext);

const resolveInitial = () => {
  // 1. Explicit user choice (highest priority) — wins forever once set.
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'en' || stored === 'uk') return stored;
  } catch (_e) { /* ignore */ }

  // 2. Browser language signals (navigator.languages array > navigator.language).
  //    We scan ALL preferred languages, not just the first one — many users
  //    in Ukraine have `ru` first but `uk` second in their preference list.
  try {
    const candidates = [];
    if (typeof navigator !== 'undefined') {
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
      if (navigator.language) candidates.push(navigator.language);
      if (navigator.userLanguage) candidates.push(navigator.userLanguage); // legacy IE
    }
    for (const raw of candidates) {
      if (!raw || typeof raw !== 'string') continue;
      const lc = raw.toLowerCase();
      // Direct Ukrainian preference.
      if (lc === 'uk' || lc.startsWith('uk-') || lc.startsWith('uk_')) return 'uk';
      // Russian preference inside Ukraine region (ru-UA) — these users live
      // in Ukraine and read Ukrainian fluently; default to UK over EN.
      if (lc === 'ru-ua' || lc === 'ru_ua') return 'uk';
    }
  } catch (_e) { /* ignore */ }

  // 3. Timezone fallback — covers users on Ukrainian time zones whose browser
  //    locale is `en-US` but who are physically in Ukraine (common with
  //    expat or English-first installs).
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === 'Europe/Kyiv' || tz === 'Europe/Kiev' || tz === 'Europe/Uzhgorod' || tz === 'Europe/Zaporozhye') {
        return 'uk';
      }
    }
  } catch (_e) { /* ignore */ }

  return 'en';
};

// Build a reverse index: English literal → key. Used by `tByEn` so that
// existing JSX with hard-coded English strings can be translated without
// touching every call site. We strip surrounding whitespace and collapse
// runs of whitespace to a single space so multi-line JSX literals match too.
const norm = (s) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : s);

const buildReverseIndex = () => {
  const out = {};
  const en = DICTIONARY.en || {};
  for (const [key, val] of Object.entries(en)) {
    if (typeof val === 'string') out[norm(val)] = key;
  }
  return out;
};

const REVERSE_EN = buildReverseIndex();

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(resolveInitial);

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch (_e) { /* ignore */ }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next) => {
    if (next === 'en' || next === 'uk') setLangState(next);
  }, []);

  const t = useCallback(
    (key, fallback) => {
      const dict = DICTIONARY[lang] || {};
      if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
      const en = DICTIONARY.en || {};
      if (Object.prototype.hasOwnProperty.call(en, key)) return en[key];
      return fallback !== undefined ? fallback : key;
    },
    [lang]
  );

  // tByEn — translate by English literal lookup. Returns input unchanged if
  // the literal isn't in the dictionary (so non-translated UI keeps rendering
  // its original English content).
  const tByEn = useCallback(
    (englishLiteral) => {
      if (typeof englishLiteral !== 'string' || !englishLiteral) return englishLiteral;
      if (lang === 'en') return englishLiteral;
      const key = REVERSE_EN[norm(englishLiteral)];
      if (!key) return englishLiteral;
      const dict = DICTIONARY[lang] || {};
      return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : englishLiteral;
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, tByEn, languages: LANGS }),
    [lang, setLang, t, tByEn]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export default LanguageProvider;
