# Cabinet i18n Sweep — 2026-05-30

**Scope:** Завершить i18n-обертку для 5 страниц веб-кабинета, помеченных как
hardcoded≈7 в отчёте `audit/CABINET_I18N_COVERAGE_2026-05-30.md`:

- `TwoFactorRecoveryPage.js`
- `GPTScopeBuilder.js`
- `AdminPricingConfigPanel.js`
- `ClientAuthPage.js`
- `ClientDeliverablePage.js`

## Что сделано

### 1. Обёртка JSX text nodes в `tByEn(...)`

Все probable hardcoded EN строки (по эвристике `cabinet-i18n-coverage.py`)
обёрнуты через существующий `tByEn` helper из `LanguageContext`. Где текст
был сегментирован inline-тегами (`<code>`, `<strong>`, `<span>`), сегменты
разделены, чтобы каждый перевелся независимо.

### 2. Расширение словаря `i18n/dictionary.js`

Добавлено **30 новых ключей** (EN + UK parity) в блок
`/* CABINET: i18n sweep 2026-05-30 ... */`:

| Префикс | Файл | Кол-во |
|---------|------|-------:|
| `cab.2fa.*` | TwoFactorRecoveryPage | 5 |
| `cab.scope.*` | GPTScopeBuilder | 6 |
| `cab.price.*` | AdminPricingConfigPanel | 11 |
| `cab.deliv.*` | ClientDeliverablePage | 7 |
| `cab.cauth.*` | ClientAuthPage | 1 |

Остальные строки (`Cancel`, `Done`, `Sign In`, `Register`, `Forgot password?`,
`or continue with`, `Back to home`, `Your estimate is saved`, `Request changes`,
`Dismiss`) уже имели соответствие в существующих ключах (`auto.*`, `auth.*`,
`common.*`, `cab2.*`) — для них `tByEn` сам резолвится по reverse-index.

### 3. Sanity checks

- `python3 /app/scripts/cabinet-i18n-coverage.py`
  - До: TwoFactor=7 GPTScope=7 Pricing=7 ClientAuth=7 ClientDelivery=7
  - После: **все 5 = 0**
  - Общий счётчик: hardcoded≈317 → **≈282** (-35), tByEn=1514 → **1555** (+41)
  - Dict EN/UK keys: 1884/1884 → **1914/1914**
- Babel parse: `OK` для всех 5 файлов
- Per-file tByEn count после правки: TwoFactor=22, GPTScope=18, Pricing=20,
  ClientAuth=13, ClientDelivery=32

## Изменённые файлы

```
/app/web/src/pages/TwoFactorRecoveryPage.js
/app/web/src/pages/GPTScopeBuilder.js
/app/web/src/pages/AdminPricingConfigPanel.js
/app/web/src/pages/ClientAuthPage.js
/app/web/src/pages/ClientDeliverablePage.js
/app/web/src/i18n/dictionary.js       (+30 ключей × 2 языка)
/app/audit/CABINET_I18N_COVERAGE_2026-05-30.md   (регенерирован)
```

## Что НЕ затронуто (по freeze-scope)

- Не меняли публичный лендинг (`LandingPage*.js`).
- Не меняли `tByEn` / `useLang` API — это уже стабильная поверхность.
- Не трогали другие топ-офендеры (`AdminExecutionIntelligence.js`,
  `NewRequest.js`, `PortfolioCaseDetail.js` и т.д.) — это отдельный sweep.

## Регистры перевода

UK-фразы выдержаны в операционном бизнес-стиле, без русизмов и калек,
консистентно с уже существующим словарём (`'Затвердити'` не `'Підтвердити'`,
`'Запросити правки'` не `'Запросити зміни'`, `'Скасувати'` не `'Відмінити'`).

---

**Готово к ревью.** Можно запускать веб-сборку (`cd /app/web && yarn build`)
и проверять рендер на UK-локали через `localStorage.setItem('evax-lang','uk')`.

---

## Batch 2 — добавлено в этой же сессии

**Файлы:**
- `AdminExecutionIntelligence.js` — был hardcoded≈15, стало **0**
- `NewRequest.js` — был hardcoded≈7, стало **0**
- `PortfolioCaseDetail.js` — был hardcoded≈7, стало **0**

**Изменения:**
- Обёрнуты 22 уникальные JSX-литералы через `tByEn(...)`. Где текст разрезан
  inline-тегами (`<br/>`, `<ArrowRight/>`, `<ChevronRight/>`), сегменты
  обёрнуты независимо.
- Добавлено **24 новых ключа** в `dictionary.js` (EN+UK parity) под
  префиксами `cab.exec.*` (13), `cab.req.*` (5), `cab.port.*` (5),
  плюс одна короткая `cab.cauth.idea_to_prod` уже была.
- Остальные строки (`Cancel`, `Operator override`, `match`, `Back`,
  `Get my estimate`) уже имели ключи — `tByEn` резолвит через reverse-index.

**Метрики после batch 2:**
- Глобально `hardcoded≈317 → 253` (-64 за обе серии)
- `tByEn=1514 → 1585` (+71)
- `dict EN/UK keys 1884/1884 → 1938/1938` (+54 пары)
- Babel parse OK для всех 3 файлов

