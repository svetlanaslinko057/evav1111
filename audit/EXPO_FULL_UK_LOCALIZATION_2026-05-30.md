# Expo Full UK Localization Pass — 2026-05-30

## Goal
Remove the half-finished Russian dictionary from the Expo app and replace it
with a complete Ukrainian + English experience. Cover auth flows, client
cabinet, developer cabinet, admin cabinet, plus modals/alerts/notifications/FAQ.

## Architecture chosen

The Expo surface has **100 .tsx screens** with **~629 hardcoded English JSX
text literals** and only 5 files originally using the `useT()` hook. Wrapping
every literal site-by-site would have required hook injection across 95 files
plus 600+ source edits — too risky in one pass.

Instead the pass installed a **drop-in `Text`/`TextInput` wrapper layer**:

```
/app/frontend/src/i18n.tsx        — types, dicts, hook, module-level state
/app/frontend/src/i18n-text.tsx   — drop-in <Text> / <TextInput> wrappers + translateAlert
```

Per-file change is a single import swap:
```tsx
- import { Text, TextInput, Alert } from 'react-native';
+ import { View, ... } from 'react-native';
+ import { Text, TextInput, translateAlert } from '@/src/i18n-text';
```

The `<Text>` wrapper subscribes to `I18nContext` and auto-translates plain
string children (incl. arrays of strings like `["Build real", "\n", "products."]`)
via the EN reverse-index. `<TextInput>` translates `placeholder` strings.
`translateAlert(...)` replaces imperative `Alert.alert(...)` and translates
title, message, and button labels through a module-level mirror of the active
language.

## Source transformations applied

`/tmp/i18n_sweep.py` ran in one pass and:

- **Touched 79 / 100 .tsx files** under `/app/frontend/app/` — swapped Text /
  TextInput imports from `react-native` to `@/src/i18n-text`
- **Replaced 180 `Alert.alert(...)` call-sites** with `translateAlert(...)`
- **Collected 1130 candidate EN literals** for translation (filtered to ~900
  legitimate UI strings after dropping TypeScript generics and code noise)
- **Fixed 1 leftover Russian alert string** in `app/chat.tsx`
  ("Голосовые сообщения недоступны" → "Voice messages unavailable" — now
  auto-translates to UK via dictionary)

## Dictionary growth

`src/i18n.tsx` EN/UK dictionaries before/after:

| | Before | After |
|---|---|---|
| EN keys | 143 | **~1070** (143 manual + ~930 `auto.NNNN`) |
| UK keys | 143 | **~1070** parity |
| File size | 21 KB | **92 KB** |
| Russian dict | 162 lines | **REMOVED** |

The new `auto.NNNN` entries were curated by hand (LLM proxy was unavailable
during the pass — pod-level auth issue with the Emergent LLM key). The
glossary covers:

- All sign-in / OTP / 2FA / quick-login flows
- Settings (Identity / Security / Appearance / Account)
- Profile (all roles), Wallet, Earnings, Payouts
- Common buttons (Save, Cancel, Submit, Delete, Reject, Approve…)
- Status labels (Active, Pending, In review, Done, Failed, Live…)
- Navigation labels (Home, Inbox, Projects, Activity, Notifications…)
- Client cabinet (Workspace, Deliverables, Validations, Versions, Payment plan)
- Developer cabinet (Assignments, Available work, Earnings, Growth, Time)
- Admin cabinet (Control, Pipeline, Users, Payouts, Reconciliation,
  Integrations)
- Tester surface (Mission, Validation, Pass/Fail/Skip)
- Modals & dialogs (Confirm logout, Discard changes, Are you sure?…)
- Notifications (Module assigned, Payment received, Decision needed…)
- FAQ & support (Tickets, Subject, Message, Attach screenshot…)
- Landing page (Build real products. Not tasks. / Software, actually shipped.
  / 30 SECONDS · NO SIGN-UP REQUIRED)

## What works now

✅ `/settings` — section headers + every row labelled in UK
✅ `/` (landing/welcome) — hero text, 3-step pipeline, capabilities chips,
   CTA button — all UK
✅ `/auth` — gateway/quick-login screen fully UK
✅ `/admin` — Control header, Snapshot stats, Quick actions, Operations
   sections, primary cards all UK (some ALL-CAPS labels are wrapped in
   sub-components which inherit Text — verify on next pass)
✅ Language switcher persists choice, syncs `_CURRENT_LANG` for non-hook
   call sites (Alert.alert, imperative dialogs)
✅ Storage migration: any persisted `'ru'` is upgraded to `'uk'` on first
   hydration
✅ Metro bundles cleanly (1564 modules, no compile errors)

## Known partial coverage

⚠️ **Bottom tab labels** (`Home / QA / Validation / Finance / Profile`) —
   these are React Navigation labels, rendered outside our Text wrapper.
   Need separate handling (use `i18n` keys in tab `title` option).

⚠️ **Some sub-component labels** (e.g. `OnboardingTourCard`'s nested role
   chips) render via memoized factories — re-check next pass.

⚠️ **Long-form text** (FAQ paragraphs, terms, long modal bodies) — fallback
   to EN until added to the glossary explicitly. The reverse-index requires
   exact-match (after whitespace collapse), so multi-sentence bodies that
   weren't pre-translated will stay EN.

⚠️ **Dynamic content from backend** — labels, messages, etc. that come from
   the API stay in whatever language the API returns (currently EN).
   Backend i18n is a separate track.

## Next-pass recommendations

1. **Tab labels** — pass `i18n` keys to `Tabs.Screen options.title`.
2. **Re-run sweep** with stricter regex once LLM proxy is fixed, batch
   translate remaining ~250 collected literals → append to dictionary.
3. **i18n parity audit** — Python script that walks every translated `<Text>`
   in collected literals vs UK dict; reports missing keys.
4. **Add `aria-label` / accessibility labels** to wrapper translation list.
5. **Backend i18n** — `Accept-Language` header → server returns translated
   email/notification copy.

## Files changed

- `/app/frontend/src/i18n.tsx` — removed RU dict, added module-level lang
  mirror + 930 `auto.NNNN` EN/UK entries
- `/app/frontend/src/i18n-text.tsx` — new wrapper layer (Text, TextInput,
  translateAlert)
- 79 .tsx files under `/app/frontend/app/` — import swap (Text/TextInput
  from wrapper, Alert.alert → translateAlert)
- `/app/frontend/app/chat.tsx` — replaced 2 hardcoded RU strings with EN
  equivalents
