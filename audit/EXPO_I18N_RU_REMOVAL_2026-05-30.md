# Expo i18n Cleanup — Russian Removal + UK as Sole Localized Language
**Date:** 2026-05-30
**Scope:** `/app/frontend/src/i18n.tsx`

## What changed

1. **`LangCode` type** narrowed from `'en' | 'ru' | 'uk'` → `'en' | 'uk'`.
2. **`LANGS` const** — Russian entry removed. Now exposes 2 languages:
   - `en` — English
   - `uk` — Українська
3. **`const RU: Dict = {...}` block** — entire 162-line Russian dictionary deleted (was incomplete per Roadmap).
4. **`DICTS` map** — `ru` slot removed. Now `{ en: EN, uk: UK }`.
5. **AsyncStorage hydration guard** — migrates legacy `'ru'` persisted choice to `'uk'`:
   ```ts
   if (v === 'ru') {
     await AsyncStorage.setItem(STORAGE_KEY, 'uk');
     setLangState('uk');
   } else if (v === 'en' || v === 'uk') {
     setLangState(v);
   }
   ```
6. **JSDoc header** updated to reflect 2-language design + the migration note.

## Parity check
- EN keys: **143**
- UK keys: **143**
- Missing UK translations: **0**
- Orphan UK keys: **0**

## What remains (separate sweep, est. 4–6 h)

The 100 `.tsx` files under `/app/frontend/app/` contain **~629 hardcoded
English JSX literals** (raw `>Text<` nodes without `tByEn()` wrapping). Only
5 files currently consume `useT()` (`settings.tsx` + 4 profile screens).

Full UK coverage of those literals would require:
1. **Per-file `tByEn` wrap** (analogous to the web cabinet's i18n sweeps —
   see `audit/CABINET_I18N_SWEEP_2026-05-30.md`).
2. **EN/UK dictionary extension** with the collected literals.
3. **`useT()` destructure injection** in 95 files that don't yet consume it.

Recommended pattern when picking up the sweep:
```ts
// 1. At top of each component file using JSX text:
import { useT } from '@/src/i18n';

// 2. Inside the component function body:
const { tByEn } = useT();

// 3. Wrap raw EN literals:
<Text>{tByEn('Save changes')}</Text>
```

The `EN_REVERSE` reverse-index in `i18n.tsx` already supports this lookup
pattern out of the box — adding a `Save changes` key to `EN` + matching
translation to `UK` is enough; no per-call key picking needed.

## Verification

- `metro bundle` successful (1563 modules).
- Screenshot of `/settings` confirms LANGUAGE row shows only **English** and
  **Українська** chips.
- Backend `/api/healthz` = 200, `/api/web-ui` serves the React cabinet.
