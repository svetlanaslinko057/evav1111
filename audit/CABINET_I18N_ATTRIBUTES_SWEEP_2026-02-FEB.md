# Cabinet i18n ATTRIBUTES Sweep — 2026-02-FEB

**Scope:** Wrap all hardcoded English JSX *attribute* values (`placeholder=`,
`title=`, `aria-label=`, `alt=`) across `/app/web/src/pages/` and
`/app/web/src/components/` with `tByEn(...)`. JSX text nodes were already
covered in prior sweeps (hardcoded≈0 globally). Attributes were the last
remaining offender.

## Results

| Metric | Before | After |
|---|---:|---:|
| Hardcoded EN attributes detected | **72** | **0** translatable, **12** intentional skips (emails / API keys / URL placeholders) |
| `tByEn(...)` wraps added | — | **60** new wraps in 30 files |
| Dict EN keys | 2145 | **2158** (+13) |
| Dict UK keys | 2145 | **2158** (+13) |
| Parity | ok | **ok** |

## Files modified (30 total)

```
pages/ScopeBuilder.js                 6 attrs
pages/LandingPage.js                  6
pages/AdminV2Portfolio.js             6
pages/LandingPageLight.js             6
pages/TwoFactorSetupPage.js           4
pages/TesterHub.js                    3
pages/DeveloperWorkPage.js            3
pages/ClientProfilePage.js            3
pages/ClientDocumentsPage.js          2
pages/BuilderAuthPage.js              1
pages/AdminProjectReprice.js          1
pages/AdminPressureTopology.js        1
pages/DeliverableBuilder.js           1
pages/NewRequest.js                   1
pages/ProjectBootingPage.js           1
pages/AdminFinancialsPage.js          1
pages/ValidatorMissionsPage.js        1
pages/ClientTransparency.js           1
pages/AdminValidationPage.js          1
pages/CreateModuleDominance.js        1
pages/AdminPaymentsPage.js            1
pages/PortfolioCaseDetail.js          1
pages/ProjectDetails.js               1
components/PortfolioInquiryModal.js   1
components/TwoFactorSetupModal.js     1
components/AutoPricingPanel.js        1
components/HonestState.js             1
components/MobileNav.js               1
components/LegalDocumentModal.js      1
components/AIRecommendationsPanel.js  1
```

## 13 new dictionary keys (under `attr.*` prefix)

| Key | EN | UK |
|---|---|---|
| `attr.qr_2fa` | `2FA QR code` | `QR-код 2FA` |
| `attr.delivery_delays` | `60% reduction in delivery delays` | `60% скорочення затримок поставки` |
| `attr.marketplace_example` | `I want to build a marketplace for vintage cars…` | `Хочу побудувати маркетплейс вінтажних авто…` |
| `attr.eg_milestone_payment` | `e.g. Milestone 1 Payment` | `напр., платіж Milestone 1` |
| `attr.eg_realtime_note` | `e.g. client confirmed realtime requirement…` | `напр., клієнт підтвердив вимогу realtime…` |
| `attr.eg_extra_integrations` | `e.g. extra integrations` | `напр., додаткові інтеграції` |
| `attr.eg_ios_browser` | `e.g. iOS 17 / Safari, Chrome 128 / macOS` | `напр., iOS 17 / Safari, Chrome 128 / macOS` |
| `attr.eg_mobile_polish` | `e.g. mobile polish, pre-release review` | `напр., поліровка мобільної версії, рев’ю перед релізом` |
| `attr.eg_module_dashboard` | `e.g., Authentication Module, Dashboard UI` | `напр., модуль автентифікації, інтерфейс дашборду` |
| `attr.eg_timezone` | `e.g., Europe/Berlin` | `напр., Europe/Berlin` |
| `attr.eg_implement_auth` | `e.g., Implement user authentication` | `напр., реалізувати автентифікацію користувача` |
| `attr.eg_payment_integration` | `e.g., Payment Integration` | `напр., платіжна інтеграція` |
| `attr.image_url_or_data` | `…or paste image URL / data-URL` | `…або вставте URL зображення / data-URL` |

Остальные 47 строк уже были в словаре (resolves через `tByEn` reverse-index)
— `'Email'`, `'Cover image'`, `'Password'`, `'Cancel'`, `'Description'`,
`'Tech Stack'`, `'API key'`, etc.

## Intentionally skipped (12 hits, не нуждаются в переводе)

`SKIP_LITERAL`: примеры email-ов (`you@email.com`, `me@example.com`,
`admin@atlas.dev`, `onboarding@resend.dev`), хосты/IDs
(`evax.io`, `pk_test_…`, `item_…`, `…apps.googleusercontent.com`),
композит-токены (`en, ru, …`, `web_app · mobile_app · saas …`).

## Контракт `tByEn` (напоминание)

- Если строка есть в reverse-index словаря → возвращает UK перевод
- Если нет → возвращает оригинал (safe fallback, UI не ломается)
- На EN-локали → возвращает оригинал без изменений (zero overhead)

## Sanity checks

```
$ node -e "const d=require('./src/i18n/dictionary.js'); 
           console.log(Object.keys(d.DICTIONARY.en).length, Object.keys(d.DICTIONARY.uk).length)"
2158 2158  ← parity preserved
```

`useLang` импорт автоматически добавлен в файлы, где его не было (большинство
уже имело его, но напр. в `DeliverableBuilder.js`, `AIRecommendationsPanel.js`
он добавился свежим).

## Сценарий валидации (вручную после `yarn build`)

1. Поднять web: `cd /app/web && yarn install && yarn build`
2. Открыть кабинет на UK-локали: `localStorage.setItem('evax-lang','uk'); location.reload()`
3. Проверить:
   - **ScopeBuilder.js** — поля «Module Title», «Description» → плейсхолдер на UK
   - **AdminV2Portfolio.js** — «Cover image», «60% reduction…» → tooltip UK
   - **TwoFactorSetupPage.js** — `aria-label="2FA QR code"` → UK
   - **LandingPage.js / LandingPageLight.js** — describe-widget placeholder → UK marketplace example
   - **MobileNav.js / TesterHub.js / ClientProfilePage.js** — все `title=` на иконках → UK

## Что осталось из roadmap (i18n logic)

После этого батча остаются:

- 🟡 **Push payload локализация** (~1ч) — `push_sender.py` принимает `lang`, читает `user.language`
- 🟡 **Notification copy при создании** (~2ч) — `t('notif.*')` в `server.py` / event handlers (≈50 call-sites)
- ⚪ **API HTTPException detail локализация** (~2ч) — спорно по DX, опционально

---

**Готово к ревью.** Атрибут-sweep кабинета закрыт. После следующей сборки
web-кабинета `placeholder/title/aria-label/alt` все будут локализованы.
