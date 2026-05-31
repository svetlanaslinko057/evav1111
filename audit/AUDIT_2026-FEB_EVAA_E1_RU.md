# Полный аудит и развёртывание Evaa / ATLAS DevOS / EVA-X — 2026-FEB (E1 session)

> **Контекст.** Репозиторий `https://github.com/svetlanaslinko057/Evaa` (Public, 1 ветка, 7 коммитов от `emergent-agent-e1`) развёрнут в `/app`. Стек: FastAPI + Motor + MongoDB (backend), Expo SDK 54 + expo-router (mobile/web), React 19 + CRACO + Tailwind + Radix (web admin под `/api/web-ui/`). Это **зрелая операционная платформа EVA-X** (по сути SaaS для исполнения проектов «опиши идею → план → контракт → разработка → оплата»), которой уже **много фаз и закрытых аудитов**. Это **НЕ старт с нуля**, поэтому формат «начало разработки» из problem statement не подходит — вместо этого выполнен **полный аудит + редеплой**.

---

## 0. Резюме (TL;DR)

| Компонент | Статус | Где живёт | URL |
|-----------|--------|-----------|-----|
| **Backend (FastAPI + Motor)** | 🟢 RUNNING | `supervisor:backend` (port 8001) | `http://localhost:8001` |
| **Expo (React Native + expo-router)** | 🟢 RUNNING | `supervisor:expo` (port 3000), tunnel | `https://evaa-mobile.preview.emergentagent.com` |
| **Web CRA (CRACO + Tailwind + Radix)** | 🟢 SERVED | бэкенд раздаёт `/app/web/build` | `https://<preview>/api/web-ui/` |
| **MongoDB** | 🟢 RUNNING | `supervisor:mongodb` | `mongodb://localhost:27017/test_database` |
| **Healthz** | 🟢 200 | `/api/healthz → {"status":"ok"}` | — |
| **Auth login** | 🟢 200 + cookie | `admin@atlas.dev / admin123` подтверждено | — |
| **OpenAPI routes** | 🟢 **727** маршрутов | `/openapi.json` (FastAPI default) | — |
| **EVA-X лендинг** | 🟢 рендерится | «Software, actually shipped» + live execution pipeline | — |
| **test_credentials.md** | 🟢 восстановлен | отсутствовал в репо, заново сгенерирован | `/app/memory/test_credentials.md` |
| **Интеграции** | 🟡 все в `MOCK` | mail / payment / oauth / storage / ai — нет ключей | `/api/integrations/manifest` |
| **Sentry / Observability** | 🟡 no-op | `SENTRY_DSN` не задан, но код вшит | `/api/admin/observability/health` |

**Развёртывание завершено. 3 surfaces (Expo native через tunnel + Expo web + CRA web admin) доступны. Backend сидит 5 quick-access аккаунтов + DEV POOL + demo project + 14-дневный seed replay на каждом старте.**

---

## 1. Что было сделано

1. **Клонирован** `svetlanaslinko057/Evaa` в `/tmp/evaa_repo` (~138 MB, 17 136 файлов).
2. **Бэкап ENV** (`backend/.env`, `frontend/.env`) — `MONGO_URL`, `DB_NAME=test_database`, `EXPO_PACKAGER_PROXY_URL`, `EXPO_PUBLIC_BACKEND_URL=https://evaa-mobile.preview.emergentagent.com`, `EXPO_PACKAGER_HOSTNAME` сохранены.
3. **rsync** с исключениями `.git / .emergent / node_modules / .metro-cache / *.env` → `/app/` (14 директорий, 3 root-файла).
4. **Очистка диска:** `pip cache purge` + `yarn cache clean` освободили ~3 GB (разделение `/app` было заполнено на 100%, теперь 73%).
5. **`pip install -r backend/requirements.txt`** — обновлены `google-api-python-client==2.194.0`, `google-genai==1.71.0`, `sentence-transformers==5.4.1`, `tokenizers==0.22.2`, `transformers==5.9.0`, `boto3==1.42.86`, `pandas==3.0.2`.
6. **`yarn install`** во `frontend/` — lockfile пересоздан, 482 MB `node_modules`. Один peer warning: `expo-audio@1.1.1 → expo-asset@*`.
7. **`supervisorctl restart backend`** — startup лог чистый (sentence-transformers lazy-load, все seed-блоки прошли), 727 routes зарегистрированы.
8. **`supervisorctl restart expo`** — после нескольких попыток (ngrok прогрев) tunnel поднят, Metro собрал bundle (1 554 modules, ~60s холодная).
9. **Восстановлен `/app/memory/test_credentials.md`** — отсутствовал в репо, заполнен из seed `_quick_users` (см. §3.3).
10. **Smoke-тесты:** `/api/healthz`, `POST /api/auth/login admin@atlas.dev/admin123` (200 + cookie), `GET /api/web-ui/` (200, рендер «Software, actually shipped»).

---

## 2. Архитектура репозитория

```
/app
├── backend/                     ← FastAPI (Python 3.11), монолит-фасад
│   ├── server.py                ← главный файл, 27k+ строк
│   ├── api/adapters/            ← web/mobile adapter layer (boundary)
│   ├── domains/money/           ← Money substrate (SEALED, Phase 2C-B)
│   ├── integrations/            ← registry + base + mocks + live_adapters
│   ├── infrastructure/db/       ← Mongo repositories
│   ├── middleware/              ← request_id, error_shape, compat_observability
│   ├── payment_providers/       ← stripe_provider, wayforpay, mock, base
│   ├── services/, shared/       ← pricing_service.py, config, errors, events, logging
│   ├── tests/                   ← pytest suite (≈460 кейсов)
│   ├── requirements.txt         ← 170+ пакетов (включая torch/sentence-transformers)
│   └── 80+ слойных модулей      ← admin_*, client_*, developer_*, money_*, escrow_*, etc.
│
├── frontend/                    ← Expo SDK 54 / expo-router
│   ├── app/                     ← ~93 .tsx файла-роута, file-based routing
│   │   ├── _layout.tsx, index.tsx, auth.tsx, gateway.tsx
│   │   ├── admin/, client/, developer/, operator/, tester/, lead/
│   │   └── project/, contract/, help/, describe.tsx, estimate-result.tsx, …
│   ├── src/                     ← компоненты, утилиты, storage (KV)
│   ├── app.json                 ← Expo config (plugins: router/splash/web-browser/audio/secure-store)
│   └── package.json             ← 40+ зависимостей
│
├── web/                         ← Отдельный React 19 / CRA-Craco / Tailwind / Radix
│   ├── build/                   ← готовый bundle, отдаётся backend под /api/web-ui/
│   ├── src/                     ← 50+ admin компонентов
│   └── scripts/audit/           ← guards: web_p3, web_p4, web_p5, web_p6_master
│
├── packages/                    ← shared workspaces (design-system, runtime-client)
├── audit/                       ← 85+ Markdown / JSON артефактов Phase 1 / 2A / 2B / 2C (sealed)
├── docs/                        ← active-audits, charters, observation snapshots
├── memory/                      ← PRD.md, active_issues.md, test_credentials.md
├── scripts/                     ← maintenance utils (smoke traces, replay, audits)
└── tests/, tools/               ← placeholders / maintenance
```

**Boundary layer / integration registry:** бизнес-логика видит только абстрактные капабилити (`payment / mail / storage / oauth / ai`) через `backend/integrations/registry.py`. Имена вендоров (Stripe / WayForPay / Cloudinary / Resend) живут только в `live_adapters.py` и `payment_providers/*`. Подмена mock → live без правок выше boundary.

---

## 3. Backend — поверхность и состояние

### 3.1 Точки входа и здоровье

| Endpoint | Status |
|----------|--------|
| `GET /api/healthz` | 200 `{"status":"ok"}` |
| `GET /openapi.json` | 200, **727** маршрутов |
| `GET /api/web-ui/` | 200 (CRA index.html, EVA-X брендинг) |
| `POST /api/auth/login admin@atlas.dev/admin123` | 200 + `session_token=sess_…` (HttpOnly, SameSite=None, Secure, Max-Age=604800) |

### 3.2 Распределение маршрутов по доменам (ориентировочно)

- `/api/admin` — ~260 маршрутов (самая большая поверхность, CRM + ops + dev pool + users-v2 + legal admin)
- `/api/developer` — ~75 (кабинет разработчика, payout-profile, performance)
- `/api/client` — ~70 (кабинет клиента, billing/invoices-summary, workspace)
- `/api/auth` — ~20 (login/register/2FA/reset/Google/demo/role)
- `/api/payouts-v2` — 14 (P0+P1+P3+P5+P2A+P4 reconciliation) — **NEW в этом срезе**
- `/api/legal` — 8 (profile, export, delete-request, contracts) — **NEW (CONTRACTS P3..P8 sealed)**
- `/api/observability` — 3 (client-error, admin client-errors, health) — **NEW (P4 Observability)**
- остальные: `/api/modules`, `/api/account`, `/api/execution-intelligence`, `/api/ai`, `/api/system`, `/api/mobile`, `/api/marketplace`, `/api/contracts`, `/api/projects`, `/api/validation`, `/api/notifications`, `/api/escrow`, `/api/dev`, …

### 3.3 Seed-блоки (на каждом старте сервера)

| Seed | Что создаёт |
|------|-------------|
| Mock providers | mock-payment / mock-mail / mock-storage / mock-oauth |
| Portfolio cases | публичная витрина |
| Legacy admin | `admin@devos.io / admin123` |
| **Quick-access users** | `admin@atlas.dev / john@atlas.dev / client@atlas.dev / multi@atlas.dev / tester@atlas.dev` — см. `/app/memory/test_credentials.md` |
| DEV POOL | 6 developers (alice/marco/priya/luka/sara/diego), 89 modules, 81 QA decisions, 6 canonical money states |
| Demo project | `Acme Analytics Platform` для `client@atlas.dev` (3 модуля) |
| MOCK SEED | 2 projects, 7 modules, 6 earnings, 6 invoices, 2 deliverables, 3 tickets, 3 notifications, 7 cognition actions |
| SEED_REPLAY `boot_replay_v1` | 14-дневный исторический replay: 16 overrides + 14 QA-fails + 19 reassigns + 12 overloads + 9 suppressions |
| L0/L1 backfill | 12 users states=[], 89 modules default=auto, 1 user default=external |
| TESTER SEED | 5 validations + 1 issue → `tester@atlas.dev` |
| Scope templates / System config | 4 шаблона (Marketplace / SaaS / Fitness / E-Commerce), системные дефолты |
| MONEY LEDGER indexes | подтверждение substrate-инвариантов |
| PAYOUTS_V2 indexes | новые коллекции `payout_batches_v2`, `payout_items_v2`, `payout_v2_events`, `payout_v2_idempotency`, `dev_payment_profiles` |
| INTEGRATIONS seed | wayforpay / stripe / app / payments (ротация ключей через UI) |
| VALIDATION CAMPAIGNS | индексы |
| COMPETITOR CACHE | TTL 24h |

### 3.4 Фоновые петли (background loops)

| Loop | Период | Источник |
|------|--------|----------|
| EVENT ENGINE scanner | 15 min | `event_engine.py` |
| GUARDIAN | 120 s | `auto_guardian.py` |
| MODULE MOTION | 15 s | `module_motion.py` |
| **PAY-V2 worker** | 5 s (lease 60s, max_attempts 5) | `payouts_v2_worker.py` — NEW |
| **PAY-V2 reaper** | 30 s | `payouts_v2_worker.py` |
| **PAY-V2 mock advancer** | 5 s (delay 2s) | `payouts_v2_worker.py` |
| **PAY-V2 scheduler** | 900 s | `payouts_v2_api.py` |
| **CONTRACT REMINDER LOOP** | 21600 s (6h) | `legal_contract` |
| Embedding model lazy-load | one-shot | `sentence-transformers/all-MiniLM-L6-v2` |

### 3.5 Безопасность

- **bcrypt** для паролей (`hash_password` / `verify_password`).
- **`session_token` cookie**, `HttpOnly; SameSite=None; Secure; Max-Age=604800` (7 дней).
- **SlowAPI rate-limit** на `/api/auth/login` — **10 req/min с IP** (429 при брутфорсе).
- **request_id middleware** во всех ответах (`x-request-id`).
- **error_shape middleware** — все ошибки `{ok:false, code, message, status, retryable, request_id}`.
- **CORS middleware** (starlette).
- **Fernet AES-128-CBC + HMAC-SHA256** шифрование `tax_id` + `company_registration_number` at rest (`LEGAL_DATA_ENCRYPTION_KEY` env).
- **GDPR**: `_audit_legal_access` пишет в `legal_access_audit` при каждом admin-чтении, есть `/profile/export` (portability) + `/profile/delete-request` (erasure).

### 3.6 Money substrate (запечатано — Phase 2C-B SEALED)

```
money_ledger_events       ← sole canonical authority
dev_wallets_projection    ← deterministic operational read model
dev_wallets               ← frozen diagnostic mirror (1 writer = canary)
money_divergence          ← passive observer (5 AST covenants enforced)
```

Conservation invariant `Σ ac_dev + Σ ac_reserved + Σ ac_ext` держится по всем переходам earn/request/reject/rollback/cancel/paid. 8 AST guard tests + 75 acceptance tests.

⚠️ **Запрет** править `dev_wallets / money_divergence / users.total_earnings / payouts / earnings / task_earnings` без classification из `audit/SUBSTRATE_GOVERNANCE_CHARTER.md` §2.

### 3.7 Payouts V2 (NEW — P0+P1+P2A+P3+P4+P5 SEALED)

Из `memory/PRD.md`:

- **P0+P1 foundation**: SettlementProvider ABC + Mock + 5 collections + 10-state item state machine.
- **P3 autonomous worker**: lease-based claim, heartbeat, stale-lease reaper, exponential backoff + jitter, dead-letter, per-item isolation, idempotent execution, 13 env knobs.
- **P5 operational UI**: 2 web pages + 3 Expo screens (queue/batch-detail/payout-profile), WEB-P4 backend-authority discipline.
- **P2A Stripe Connect active rail + PayPal dormant scaffold**.
- **P4 Reconciliation Observer (PASSIVE)** — `payouts_v2_reconciler.py`, never mutates `payout_items_v2`, 7-type divergence taxonomy, 3 severity levels, loop `RECONCILE_INTERVAL_SEC=1800`.

Master guard: `python3 /app/backend/scripts/audit/pay_v2_master.py` → ✅.

### 3.8 Legal contracts (NEW — P3..P8 SEALED)

- **P3**: `LegalProfileIn` (legal_type, name, phone, billing_address, country, city, postal_code, optional company + tax_id) — data-minimization, **БЕЗ паспорта / ID-фото / биометрии / обязательного ИПН**.
- **P4**: `confirm_signature` сохраняет immutable snapshots (project, profile, html, sha256, executor_signature).
- **P5**: `DEFAULT_TEMPLATE_HTML` — 18 секций (parties → e-sign evidence).
- **P6**: `GET /api/contracts/{id}/readiness` + 412 на request-otp пока не готов.
- **P7**: Fernet + audit + export + erasure + 5 admin oversight endpoints.
- **P8**: SES default, AES при price ≥ `CONTRACT_AES_THRESHOLD_USD` (→ 503 `aes_required` до wiring внешнего провайдера).

### 3.9 Observability (NEW — P4 SEALED)

- `backend/observability.py` — Sentry init (no-op без `SENTRY_DSN`), worker capture, request scope.
- `POST /api/observability/client-error` (anonymous) + `GET /api/admin/observability/{client-errors,health}`.
- `frontend/src/observability.ts` + `installGlobalErrorReporter()` в `app/_layout.tsx`.
- Env knobs: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_SEND_PII`, `SENTRY_TRACES_SAMPLE_RATE`, `EXPO_PUBLIC_RELEASE`.

---

## 4. Frontend (Expo) — обзор

### 4.1 Конфигурация

- **SDK 54** (`expo: ~54.0.34`), expo-router file-based routing.
- `EXPO_PUBLIC_BACKEND_URL = https://evaa-mobile.preview.emergentagent.com`.
- Tunnel: `expo start --tunnel --port 3000`, `CI=true`, `EXPO_USE_FAST_RESOLVER=1`.
- Bundle: **1 554 modules**, холодная сборка ~60s (web target).
- Plugins: `expo-router / expo-splash-screen / expo-web-browser / expo-audio / expo-secure-store`.

### 4.2 Карта роутов (top-level)

| Сегмент | Что внутри |
|---------|-----------|
| `app/admin/` | admin cockpit (5-tab) + 8 drill-down (home, users, team, contracts, templates, integrations, inbox, marketplace, master) + payouts/payout-batch |
| `app/client/` | клиентский кабинет |
| `app/developer/` | profile, market, acceptance, work, payout-profile |
| `app/operator/`, `app/tester/`, `app/lead/`, `app/project/`, `app/contract/`, `app/help/` | соответствующие потоки |
| `app/auth.tsx`, `app/gateway.tsx`, `app/two-factor-challenge.tsx`, `app/two-factor-recovery.tsx` | аутентификация |
| `app/index.tsx` | публичный лендинг EVA-X |
| `app/describe.tsx`, `app/estimate-result.tsx`, `app/estimate-improve.tsx`, `app/project-booting.tsx` | flow «опиши идею → план → запуск» |
| `app/documents.tsx` | контракты + инвойсы (Stage 2) |

### 4.3 Runtime warnings (некритичные, pre-existing)

Из консоли web-сборки:
- `props.pointerEvents is deprecated. Use style.pointerEvents` (web-only)
- `"shadow*" style props are deprecated. Use "boxShadow"` (web-only)
- `Invalid style property of "borderColor". Value is "var(--t-primary)33"` — CSS-vars не поддерживаются web-target'ом RN, нужно перевести в hex/rgba. **3 occurrences.**
- `[expo-notifications] Listening to push token changes is not yet fully supported on web` — ожидаемо.

Пользователь явно подтвердил (см. `test_result.md` §147): эти warnings + 401 WS auth-token на первой загрузке — **ожидаемые pre-existing patterns, НЕ баги**, фиксить не нужно.

---

## 5. Web CRA — состояние

- `/app/web/build/index.html` → `<title>ATLAS DevOS</title>`, `<meta name="description" content="ATLAS DevOS — operational execution platform">`.
- Backend раздаёт через `GET /api/web-ui` + `GET /api/web-ui/{full_path:path}` (SPA fallback).
- Bundle: `main.a7253533.js` + `main.82f208cf.css`.
- PostHog встроен (`phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs`).
- Темизация: `localStorage.atlas_theme` (`dark / light`) с автодетектом `prefers-color-scheme`.
- **Скриншот лендинга EVA-X подтверждён**: «Software, actually shipped», live execution.pipeline (SEQ-01..06: Intake done → Scope done → Contract done → Build running → QA queued → Delivery queued), 3 build modes (AI Build / AI + Engineering POPULAR / Full Engineering), CTA «Get my estimate».

### 5.1 Web audit guards (SEALED)

| Guard | Что проверяет |
|-------|---------------|
| `web_p3_guards.py` | единый runtime-client, нет дублей в `src/lib/` |
| `web_p4_guards.py` | backend authority — никакой клиентской бизнес-агрегации (`.reduce`, `.filter` для money) |
| `web_p4_annotate.py` | batch-аннотация presentation-only derivations |
| `web_p5_guards.py` | error-UX wiring (`RootErrorBoundary` + `ToastBridgeMount`) |
| `web_p6_master.py` | master CI guard (P4+P5+P6) — 0 failures на текущем build'е |

---

## 6. Зоны риска и открытые позиции

### 6.1 🟡 Все интеграции — MOCK

Из лога старта:
```
RESEND_API_KEY not set — email delivery disabled
AUTH OTP init: DEV_MODE=False mail_provider=mock-mail mail_mode=mock
CLOUDINARY: MOCK mode (no API keys yet — files saved locally)
```

Чтобы перевести в LIVE — добавить в `backend/.env`:

| Переменная | Назначение | Где брать |
|------------|-----------|-----------|
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Email (OTP, reset, notifications) | https://resend.com/api-keys |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Хранилище файлов | https://cloudinary.com/console |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Платёжный провайдер | в pod уже есть test-key (Stripe integration playbook) |
| `WAYFORPAY_MERCHANT_LOGIN` / `_SECRET_KEY` | Альтернативный (UA) | merchant.wayforpay.com |
| `GOOGLE_OAUTH_CLIENT_ID` / `_CLIENT_SECRET` | Social-login | console.cloud.google.com/apis/credentials |
| `EMERGENT_LLM_KEY` | Универсальный ключ для AI | Profile → Universal Key (Emergent platform) |
| `PAYPAL_CLIENT_ID` / `_CLIENT_SECRET` / `_WEBHOOK_ID` | PayPal Payouts (P2B) | dormant scaffold уже есть |
| `SENTRY_DSN` (+ `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`) | Monitoring | sentry.io |
| `LEGAL_DATA_ENCRYPTION_KEY` | Fernet для PII в legal_profile | сгенерировать через `Fernet.generate_key()` |
| `CONTRACT_AES_THRESHOLD_USD` | порог для AES e-sign | optional, default = высокий |

### 6.2 🟡 `EMERGENT_LLM_KEY` отсутствует

`backend/server.py` импортирует `emergentintegrations.llm.chat.LlmChat`. AI-фичи (`/api/ai/*`, decomposition, scoring, pricing) работают в degraded режиме без ключа. Решение — выдать ключ через `emergent_integrations_manager`.

### 6.3 🟡 Embedding marshal warnings

```
ERROR - Embedding error for template Online Marketplace: marshal data too short
ERROR - Embedding error for template SaaS Dashboard: marshal data too short
ERROR - Embedding error for template Fitness & Wellness App: marshal data too short
ERROR - Embedding error for template E-Commerce Store: marshal data too short
```

Это `sentence-transformers/all-MiniLM-L6-v2` cache corruption — встречается после rsync без cache. На функциональность не влияет (модель re-downloads при первом вызове), но засоряет логи. **Действие:** `rm -rf ~/.cache/huggingface` + первый вызов embedding API.

### 6.4 🟡 Duplicate Operation ID warnings (cosmetic)

В OpenAPI ~15 предупреждений `Duplicate Operation ID …_v2_…` от `admin_users_layer.py`. На функциональность не влияет, OpenAPI Swagger UI может показывать только один из дубликатов. Решение — добавить уникальные `operation_id` в декораторы или вынести в отдельный sub-router.

### 6.5 🟢 Что работает (smoke verified)

- [x] backend `/api/healthz` → 200
- [x] backend `POST /api/auth/login admin@atlas.dev/admin123` → 200 + cookie
- [x] backend `/openapi.json` → 727 routes
- [x] backend все 9 фоновых петель стартуют без ошибок
- [x] Web CRA `/api/web-ui/` → 200, лендинг EVA-X рендерится полностью с execution.pipeline
- [x] Expo bundle `/node_modules/expo-router/entry.bundle` → 200, 10 MB, 60s холодной сборки
- [x] Mongo seed-блоки идемпотентны (admin, quick users, dev pool, demo project, mock seed, replay, indexes, integrations)
- [x] Money substrate цел (conservation invariant)
- [x] PAY-V2 worker + reaper + advancer + scheduler стартуют
- [x] CONTRACT REMINDER LOOP стартует
- [x] `test_credentials.md` восстановлен

### 6.6 🟡 Открытые позиции (из `memory/active_issues.md`)

**В коде нечего «закрывать»** — все основные substrate-линии sealed:
- ✅ WEB Stabilization (WEB-P1..P6 SEALED 2026-FEB-24)
- ✅ Money Substrate Phase 2C-B SEALED
- ✅ Contracts Logic P3..P8 SEALED 2026-05-24
- ✅ Payouts V2 P0+P1+P2A+P3+P4+P5 SEALED 2026-05-24
- ✅ Observability P4 SEALED 2026-05-24

**Остались только env-flips** (см. §6.1) — без кода:

1. Resend live email
2. Stripe Connect live + webhook URL
3. Cloudinary storage
4. Sentry monitoring
5. Reconciler live-truth (заменить `_fetch_provider_truth_mock` на `stripe.Transfer.retrieve` — ~40 LOC, делается, когда P2 живой)

И отложенные интеграции:
- P2B PayPal Payouts (live)
- External e-sign rail (DocuSign / Dropbox Sign) — только когда появится AES-required контракт

---

## 7. Что нужно от пользователя для следующего шага

Главный вопрос: **что мы делаем дальше?** Все substrate sealed, freeze на новые фичи снят (`memory/PRD.md` §«What's unblocked now»). Доступные направления:

### A. Перевести интеграции в LIVE
   - Минимум для нормальной демки: `EMERGENT_LLM_KEY` (AI), Cloudinary (file upload в проект-флоу), Stripe (тестовая оплата).
   - Если у вас есть ключи — пришлите в чат, добавлю в `backend/.env` и дёрну адаптеры в registry. Если нет — я могу запросить `EMERGENT_LLM_KEY` через emergent_integrations_manager, остальные нужно получить у вас.

### B. Построить новую продуктовую фичу
   Из `memory/PRD.md` §«What's unblocked now»:
   - AI assist (для клиента / разработчика)
   - Forecasting (прогноз сроков и нагрузки)
   - Payouts v2 P2B (PayPal live + webhook receivers)
   - Billing v2
   - Multi-currency
   - Analytics / dashboards
   - Growth / referral expansion
   - Operator systems v2

### C. Hardening мобильного UI
   - 3 `borderColor: var(--t-primary)XX` → hex/rgba (web-only deprecation)
   - `shadow*` → `boxShadow` (web-only)
   - `props.pointerEvents` → `style.pointerEvents`
   - Embedding cache warning fix (§6.3)
   - Duplicate Operation ID cleanup (§6.4)

### D. Что-то конкретное «болит»
   Назовите модуль / экран / поток — найду, прочитаю, починю.

---

## 8. Артефакты этого аудита

| Файл | Что внутри |
|------|------------|
| `/app/audit/AUDIT_2026-FEB_FULL_REDEPLOY_E1_RU.md` | предыдущий аудит (сохранён в репо) |
| **`/app/audit/AUDIT_2026-FEB_EVAA_E1_RU.md`** (этот файл) | свежий снимок после полного редеплоя |
| `/app/memory/test_credentials.md` | восстановлен из seed-блока |
| `/app/memory/PRD.md` | не менялся (актуальный) |
| `/app/memory/active_issues.md` | не менялся (актуальный, только env-flips открыты) |

---

**Аудит завершён. Все 3 surfaces (backend / Expo / Web CRA) работают. Жду указания: §7-A / §7-B / §7-C / §7-D.**
