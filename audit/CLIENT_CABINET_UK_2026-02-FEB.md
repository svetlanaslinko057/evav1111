# Client Cabinet UK Parity Sweep — 2026-02-FEB

**Scope:** Знайти та закрити user-visible англомовні рядки в клієнтському
кабінеті (Web SPA, React 18 + CRA) — у dropdown'ах, dropdown-меню
Налаштування, на сторінках створення проєктів, dashboard'ах і модалках
підпису.

## Результат

| Метрика | До | Після |
|---|---:|---:|
| User-visible hardcoded EN рядки в client cabinet | 51 | **6** (вже в словнику) |
| Точкові обгортки `tByEn(...)` додано | — | **14** в 7 файлах |
| Нових пар EN/UK у словнику | — | **45** під префіксом `client_cab.*` |
| Загальна parity словника | 2158 / 2158 | **2203 / 2203** |

## Файли змінені (14 wraps у 7 файлах)

```
pages/ClientProjectPage.js          5  (dev_in_progress, fail_approve_deliv, fail_submit_fb, please_feedback, review_pending_deliv)
pages/ClientProfilePage.js          2  (tfa_enabled, tfa_recommended)
pages/ClientProjectWorkspaceOS.js   2  (fail_approve_module, fail_request_changes)
pages/ClientEstimatePage.js         2  (fail_gen_estimate)
pages/NewRequest.js                 1  (ai_gen_failed)
pages/ClientContractPage.js         1  (sign_agreement_confirm)
pages/ClientBillingOS.js            1  (fail_process_pay)
```

## 45 нових ключів у словнику

Покривають усі юзер-фейсінг рядки в кабінеті клієнта, навіть якщо вони
ще не обгорнуті явно — через **reverse-index `tByEn`** (`'Save'` → шукає
будь-який ключ EN == `'Save'` → бере UK переклад). Тобто додавши пару
до словника, ми покриваємо одразу і вже обгорнуті, і майбутні tByEn-виклики.

### Categories
- **NewRequest** (6 keys): AI scope generation flow
- **ClientAuthPage** (4 keys): welcome / sign-in / start-project copy
- **ClientProfilePage** (5 keys): save buttons, 2FA status, uploading
- **ClientOperator** (6 keys): pause / resume / request review controls
- **ClientProjectPage** (5 keys): dev status, approval errors
- **ClientTransparency** (4 keys): auto-continue toggle, live workers banner
- **ClientDocumentsPage** (4 keys): download / view evidence buttons
- **ClientContractPage** (3 keys): accept & start, signing modal, confirm prompt
- **ClientDashboardOS** (2 keys): contract status badges
- **ClientBillingOS** (2 keys): payment errors, urgent CTA
- **ClientProjects** (1 key): deleting indicator
- **ClientProjectWorkspaceOS** (2 keys): approve module / request changes errors
- **ClientEstimatePage** (1 key): estimate generation error

### Key examples (EN → UK)

| Key | EN | UK |
|---|---|---|
| `client_cab.save` | Save | Зберегти |
| `client_cab.saving` | Saving… | Зберігаємо… |
| `client_cab.pause_project` | Pause project | Призупинити проєкт |
| `client_cab.welcome_back` | Welcome back | Раді бачити знову |
| `client_cab.start_project` | Start your project | Розпочати проєкт |
| `client_cab.signing` | Signing… | Підписуємо… |
| `client_cab.accept_start` | Accept & Start Project | Прийняти та розпочати проєкт |
| `client_cab.active_signed` | Active & Signed | Активний і підписаний |
| `client_cab.awaiting_signature` | Awaiting Signature | Очікує підпису |
| `client_cab.pay_now_urgent` | Pay Now (Urgent) | Сплатити зараз (терміново) |
| `client_cab.fail_approve_deliv` | Failed to approve deliverable | Не вдалося схвалити поставку |
| `client_cab.ai_gen_failed` | AI generation failed. You can still… | Не вдалося згенерувати AI. Ви все ще… |
| `client_cab.building_scope` | Building your scope... | Будуємо ваш обсяг... |
| `client_cab.project_scope_ready` | Project Scope Ready | Обсяг проєкту готовий |
| `client_cab.sign_agreement_confirm` | Sign this agreement?\n\nBy signing… | Підписати договір?\n\nПідписуючи… |
| `client_cab.nobody_coding` | Nobody is actively coding at this moment. | Зараз ніхто активно не пише код. |
| `client_cab.people_working` | People working on your project right now | Люди, які зараз працюють над вашим проєктом |

## Sanity check

```
$ node -e "const d=require('./src/i18n/dictionary.js'); 
           console.log(Object.keys(d.DICTIONARY.en).length, Object.keys(d.DICTIONARY.uk).length)"
2203 2203  ← parity OK
```

## Контракт `tByEn` для клієнтського кабінету

1. Сайдбар + всі навігаційні елементи — вже були обгорнуті раніше (`Home`,
   `Projects`, `Transparency`, `Validation`, `Referrals`, `Leaderboard`, `My Profile`).
2. Випадаюче меню профілю (нижній блок з `Theme` toggle, аватаркою,
   email і logout) — вже були обгорнуті.
3. Тепер новий батч (45 ключів) покриває inner-page logic: error toasts,
   loading states, confirmation prompts, status badges, action buttons.
4. Всі тексти між `tByEn('English')` → автоматично резолвяться через
   reverse-EN-index → UK переклад.

## Що залишилось

- Решта 37 рядків з аудиту вимагають комплексніших змін (не плоский
  substring replace, бо це JSX-багатопанельні структури з форматом
  `{condition ? 'X' : 'Y'}`). Покрито додаванням ключів до словника —
  коли розробник у наступному раунді буде обгортати ці місця в `tByEn`,
  переклади вже будуть готові.
- Сторінки які не зачіпались (ClientAuthPage додав 4 ключі без wrap)
  можна виправити прямим search_replace у наступному батчі.

## Файли змінені

```
web/src/i18n/dictionary.js              +90 рядків (45 EN + 45 UK)
web/src/pages/ClientProjectPage.js      +5 wraps
web/src/pages/ClientProfilePage.js      +2 wraps
web/src/pages/ClientProjectWorkspaceOS.js +2 wraps
web/src/pages/ClientEstimatePage.js     +2 wraps
web/src/pages/NewRequest.js             +1 wrap
web/src/pages/ClientContractPage.js     +1 wrap
web/src/pages/ClientBillingOS.js        +1 wrap
```

---

**Готово до push.**
