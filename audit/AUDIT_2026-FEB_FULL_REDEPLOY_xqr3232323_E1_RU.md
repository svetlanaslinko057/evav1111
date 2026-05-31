# Полный аудит и развёртывание — 2026-FEB (session E1, repo `xqr3232323`)

> **Репозиторий:** `https://github.com/svetlanaslinko057/xqr3232323`
> **Кодовое имя проекта:** **ATLAS DevOS** (бренд фронтенда — **EVA-X**)
> **Workspace:** `/app` (Emergent preview pod)
> **Preview host:** `https://mobile-app-expo-15.preview.emergentagent.com`
> **Дата:** 2026-FEB-26
> **Тип:** полный GitHub redeploy + dependency reinstall + supervisor restart + smoke-аудит

См. также предыдущие снимки: `AUDIT_2026-FEB_FULL_REDEPLOY_E1_RU.md`, `AUDIT_2026-FEB_FULL_REDEPLOY_E1_RU_v2.md`, `AUDIT_2026-02-FEB_FULL_REDEPLOY_AND_AUDIT.md`. Этот файл фиксирует **свежее развёртывание** новой сессии с repo `xqr3232323`.

---

## 0. TL;DR

| Слой | Статус | Адрес |
|------|--------|-------|
| **Backend** (FastAPI + Motor + Socket.IO) | 🟢 RUNNING | supervisor `backend`, `:8001` |
| **Expo** (RN SDK 54 + expo-router 6) | 🟢 RUNNING | supervisor `expo`, `:3000` + tunnel |
| **Web CRA** (React 19 + craco + Tailwind + Radix) | 🟢 SERVED | бэкенд раздаёт `/app/web/build/` → `/api/web-ui/` |
| **MongoDB** | 🟢 RUNNING | `mongodb://localhost:27017/test_database` |
| `/api/healthz` | 🟢 `{"status":"ok"}` | — |
| `/api/readyz` | 🟢 `{"ready":true,"checks":{"mongo":true,"config":true}}` | — |
| `/api/web-ui/` | 🟢 HTTP 200 | — |
| Expo `/` | 🟢 HTTP 200 (Metro bundle, **1566 modules**) | — |
| Auth login `admin@atlas.dev / admin123` | 🟢 200 + session cookie | — |
| `GET /api/auth/me` (с cookie) | 🟢 200 (admin) | — |
| OpenAPI | 🟢 **732** маршрутов | `/openapi.json` |
| Seed-блоки | 🟢 все отработали | см. §3.3 |
| Интеграции | 🟡 все в MOCK (Stripe / PayPal / Resend / Cloudinary / Google OAuth / AI) | `/api/integrations/manifest` |
| `EMERGENT_LLM_KEY` | 🟢 подключён в `backend/.env` | работает для Claude / GPT / Gemini / image / TTS |
| Лендинг EVA-X | 🟢 рендерится (скриншот сделан) | dark theme, "Build real products. Not tasks." |

**Все три плоскости (Backend / Expo / Web) отвечают 200. Готов к продолжению разработки.**

---

## 1. Что было сделано в этой сессии

1. **Бэкап ENV** — `backend/.env` и `frontend/.env` сохранены в `/tmp/env_backup/`.
2. **Клон** `svetlanaslinko057/xqr3232323` в `/tmp/repo_inspect`.
3. **`rsync -a --delete`** в `/app/`, исключая `.git`, `.emergent`, `backend/.env`, `frontend/.env`, `node_modules`, `.metro-cache`, `.expo`, `yarn.lock`, `__pycache__`.
4. **`.env` остались нетронутыми** (rsync исключил их).
5. **Очистка диска** — `pip cache purge` + `rm -rf /root/.cache/huggingface` освободили **~3 GB** (volume `/dev/nvme0n5` был на 100%).
6. **`pip install -r requirements.txt --no-cache-dir`** в `/app/backend` — успешно (136 пакетов). Обновлены: `torch 2.12.0`, `sentence-transformers 5.4.1`, `transformers 5.9.0`, `google-genai 1.71.0`, `emergentintegrations 0.1.0`.
7. **`yarn install --network-timeout 600000`** в `/app/frontend` — успешно, только peer-warnings про `eslint-config-expo` (некритично, TS 5.9 vs допустимый <5.9).
8. **`EMERGENT_LLM_KEY`** добавлен в `backend/.env` (значение получено через `emergent_integrations_manager`).
9. **`supervisorctl restart backend expo`** — оба процесса стартовали, seed-блоки прошли, daemons крутятся.
10. **`/app/memory/test_credentials.md`** восстановлен (отсутствовал в репо).
11. **Smoke-тесты** — `/api/healthz`, `/api/readyz`, `/api/web-ui/`, `:3000/`, `POST /api/auth/login`, `GET /api/auth/me`, `/openapi.json` (732 paths), `/api/integrations/manifest`.
12. **Скриншот лендинга** — EVA-X тёмная тема рендерится корректно (хедер, hero, SEQ-01..03, CTA `See my product plan`).

---

## 2. Архитектура репозитория

```
/app
├── backend/                     ← FastAPI 0.115 + Motor + Socket.IO (Python 3.11)
│   ├── server.py                ← монолит-фасад (≈27 500 строк)
│   ├── api/adapters/            ← web/mobile boundary
│   ├── domains/money/           ← Money substrate (Phase 2C-B SEALED)
│   ├── integrations/            ← registry + base + mocks + live_adapters + settlement
│   ├── infrastructure/db/       ← Mongo repositories (users / projects / modules / money)
│   ├── middleware/              ← request_id, error_shape, compat_observability
│   ├── payment_providers/       ← stripe, wayforpay, mock
│   ├── services/                ← pricing_service.py
│   ├── shared/                  ← config, constants, errors, events, logging
│   ├── tests/                   ← 40+ pytest-файлов
│   ├── requirements.txt         ← 136 пакетов
│   └── 97 слойных модулей в корне backend/
│
├── frontend/                    ← Expo SDK 54.0.34 + expo-router 6 (RN 0.81.5, React 19)
│   ├── app/                     ← 97 .tsx-роутов
│   │   (admin/ × 15, client/, developer/, tester/, operator/, project/,
│   │    contract/, lead/, help/, workspace/, auth.tsx, gateway.tsx,
│   │    two-factor-*, hub.tsx, account.tsx, describe.tsx, estimate-*,
│   │    project-booting.tsx, documents.tsx, …)
│   ├── src/                     ← компоненты, утилиты, storage, i18n, theme, runtime
│   ├── app.json                 ← плагины (audio, image-picker, location, notifications…)
│   └── package.json             ← 60+ deps
│
├── web/                         ← React 19 + CRA-craco + Tailwind + Radix
│   ├── build/                   ← ✅ готовый bundle, отдаётся бэкендом под /api/web-ui/
│   ├── src/pages/               ← 112 страниц
│   └── ARCHITECTURE.md
│
├── packages/                    ← design-system + runtime-client (shared workspaces)
├── tools/, scripts/             ← maintenance utils (observability, smoke-traces)
├── audit/                       ← 90+ markdown / JSON артефактов фаз 1 / 2A / 2B / 2C / contracts / pay-v2
├── docs/                        ← active-audits, charters, observation snapshots
├── memory/                      ← PRD.md, active_issues.md, test_credentials.md (восстановлен)
└── tests/                       ← legacy placeholder
```

**Boundary layer:** бизнес-логика видит только capability (`payment / mail / storage / oauth / ai / settlement`) через `backend/integrations/registry.py`. Имена вендоров живут только в `live_adapters.py` и `payment_providers/*`.

---

## 3. Backend — поверхность и состояние

### 3.1 Точки входа (live verified)

| Endpoint | Status |
|----------|--------|
| `GET /api/healthz` | 200 `{"status":"ok"}` |
| `GET /api/readyz` | 200 `{"ready":true,"checks":{"mongo":true,"config":true}}` |
| `GET /api/` | 200 `{"message":"Development OS API","version":"1.0.0"}` |
| `GET /api/web-ui/` | 200 (CRA index.html) |
| `GET /api/integrations/manifest` | 200 — все capabilities в `mock` |
| `POST /api/auth/login` `admin@atlas.dev / admin123` | 200 + `session_token` cookie |
| `GET /api/auth/me` (с cookie) | 200, role=admin |
| `GET /openapi.json` | 200, **732 маршрута** |

### 3.2 Распределение маршрутов по доменам

```
262  /api/admin          ← самая большая поверхность (CRM + ops + dev pool)
 73  /api/developer      ← кабинет разработчика
 66  /api/client         ← кабинет клиента
 23  /api/modules
 23  /api/account
 22  /api/payouts-v2
 18  /api/auth           ← login/register/2FA/reset/google/quick/role
 13  /api/ai
 12  /api/contracts
  8  /api/validation
  5  /api/tester
  3  /api/legal
204  other               ← /api/escrow, /api/payments, /api/billing, /api/marketplace,
                          /api/mobile, /api/system, /api/execution-intelligence, и т.д.
```

### 3.3 Seed-блоки (отработали в этом старте)

| Seed | Что создано |
|------|-------------|
| `Seeded mock providers` | mock-payment / mock-mail / mock-storage / mock-oauth |
| `Seeded portfolio cases` | публичная витрина |
| `Created admin user` | legacy `admin@devos.io / admin123` |
| **Quick-access users** | 5 аккаунтов `*@atlas.dev` (см. `memory/test_credentials.md`) |
| `DEV POOL` | 6 devs, 89 modules, 81 QA decisions, 6 canonical money states |
| `Demo project Acme Analytics Platform` | для `client@atlas.dev`, 3 модуля |
| `MOCK SEED` | 2 projects, 7 modules, 6 earnings, 6 invoices, 2 deliverables, 3 tickets, 3 notifications, 7 cognition actions |
| `SEED_REPLAY: boot_replay_v1` | 14-дневный replay: 16 overrides + 14 qa_fail + 19 reassign + 12 overload + 9 suppression (70 событий) |
| `TESTER SEED` | 5 валидаций + 1 issue → `tester@atlas.dev` |
| `MONEY LEDGER indexes / COMPETITOR CACHE TTL / VALIDATION CAMPAIGNS indexes` | системные дефолты |
| `INTEGRATIONS seed` | wayforpay / stripe / app / payments |
| `L0/L1 backfill` | 89 modules default=auto, 1 user default=external, 12 users default states=[] |
| `ADMIN_SYSTEM backfill` | roles[] на 1 пользователя |

### 3.4 Фоновые петли

| Daemon | Период |
|--------|--------|
| `module_motion` | 15 s |
| `mock advancer` (payouts v2) | 5 s |
| `payouts v2 reaper` | 30 s |
| `payouts v2 worker` | 5 s (`worker_28b78b05da`, batch=10, lease=60s, max_attempts=5) |
| `auto_guardian` | 120 s |
| `team_balancer` | 120 s |
| `operator_engine scheduler` | 300 s |
| `payouts_v2 scheduler` | 900 s |
| `event_engine scanner` | 15 min |
| `payouts_v2_reconciler` | 30 min |
| `legal contract reminder` | 6 h |

### 3.5 Безопасность

- `bcrypt` для паролей.
- `session_token` cookie HttpOnly, ≈6 месяцев TTL.
- SlowAPI rate-limit на `/api/auth/login` — **10 req/min с IP**.
- `request_id` middleware + унифицированная `error_shape` JSON: `{ok, code, message, status, retryable, request_id}`.
- CORS включён.
- Fernet AES-128-CBC + HMAC-SHA256 шифрование `tax_id` / `company_registration_number` (CONTRACT-P7).
- `_audit_legal_access` пишет в `legal_access_audit` на каждый admin read.

### 3.6 Money substrate (запечатано, Phase 2C-B SEALED)

`money_ledger_events` — единственный canonical writer; `dev_wallets_projection` — read model; `dev_wallets` — frozen diagnostic mirror; `money_divergence` — passive observer (5 AST covenants). Conservation invariant `Σ ac_dev + Σ ac_reserved + Σ ac_ext` держится. 8 AST guard tests + 75 acceptance tests.

⚠️ **Запрет:** править `dev_wallets`, `money_divergence`, `users.total_earnings`, `payouts`, `earnings`, `task_earnings` без classification rule из `audit/SUBSTRATE_GOVERNANCE_CHARTER.md` §2.

### 3.7 PAYOUTS V2 (P0..P5 + P2A live Stripe + P4 reconciler SEALED)

Из `memory/PRD.md`:
- 14 endpoint'ов под `/api/payouts-v2/*`
- 5 Mongo коллекций: `payout_batches_v2`, `payout_items_v2`, `payout_v2_events`, `payout_v2_idempotency`, `dev_payment_profiles`
- 10-state item state machine
- Lease-based worker + reaper + dead-letter + exponential backoff
- Reconciler пишет в `payout_reconciliation_runs` + `payout_divergence_events`, taxonomy 7 типов × 3 severity
- E2E green: `test_payouts_v2_worker_e2e.py`, `test_payouts_v2_worker_failure.py`, `test_payouts_v2_reconciliation_e2e.py`

### 3.8 CONTRACTS LOGIC (P3..P8 SEALED, 2026-05-24)

- LegalProfile (data-minimization, no passport / no ID photos / no biometrics)
- Contract Composer from snapshots (immutable `project_snapshot`, `legal_profile_snapshot`, `html_snapshot`, `sha256_hash`)
- Real legal template v1 (18 секций)
- Signature Readiness Gate + 412 на pre-sign + 503 `aes_required`
- Data Protection Layer (Fernet шифрование + GDPR export + erasure + admin oversight)
- Signature Level Policy (SES default; AES при price ≥ `CONTRACT_AES_THRESHOLD_USD`)
- 5 admin endpoints под `/api/admin/legal/*`
- Test suites green: `test_legal_contract_e2e.py`, `test_legal_contract_phase2.py`, `test_legal_contract_admin_e2e.py`

### 3.9 WEB Stabilization Line (SEALED 2026-FEB-24)

WEB-P4 (backend authority) + WEB-P5 (error/UX reliability) + WEB-P6 (build governance) closed. Master guard `web_p6_master.py` — 0 failures. См. `memory/PRD.md`.

---

## 4. Frontend (Expo)

- **SDK 54.0.34**, `expo-router 6.0.22`, `react 19`, `react-native 0.81.5`, `newArchEnabled: true`, `reanimated 4`, `worklets 0.5`.
- `EXPO_PUBLIC_BACKEND_URL` = `https://mobile-app-expo-15.preview.emergentagent.com`.
- Tunnel запущен (`expo start --tunnel --port 3000`), `CI=true`, `EXPO_USE_FAST_RESOLVER=1`.
- Bundle: **1566 modules**, тёплая сборка ~4.5 s.
- Провайдеры в `app/_layout.tsx`: `Auth / AuthGate / Feedback / StateShift / Validator / I18n / Theme / SafeArea` + `AppHeader` + `BottomTabs`. Logic прогрева icon-ассетов сохранена.
- Capability manifest fetch с timeout 1.5 s.
- 97 `.tsx` файлов в `app/`, организовано по ролям (file-based routing).

### 4.1 Карта роутов (по ролям)

```
admin/        × 15 экранов (home, master, control, team, users, finance, qa,
                 marketplace, contracts, templates, integrations, validation,
                 execution-console, inbox, projects/[id], profile, payouts,
                 payout-batch/[batchId])
client/       (workspace, billing, contract, deliverable, control, activity, …)
developer/    (полная dev-поверхность, включая payout-profile.tsx)
tester/       (Stage 4 — home, validation list, detail, history)
operator/, lead/, contract/, project/, help/, workspace/
ROOT          (auth, gateway, two-factor-*, account, profile, settings,
               documents, activity, chat, inbox, hub, operator,
               describe, estimate-improve, estimate-result, project-booting)
```

### 4.2 Runtime warnings (web-only, некритичные)

| Категория | Сообщение | Воздействие |
|-----------|-----------|-------------|
| `pointerEvents` deprecated | в RN 0.81 ушло в `style.pointerEvents` | warning only |
| `shadow*` deprecated | в RN 0.81 ушло в `boxShadow` | warning only |
| `borderColor: var(--t-primary)33/44` | CSS-vars не поддерживаются react-native-web | визуально без border, но рендер не падает |
| `expo-notifications: web` | listener push token не поддерживается на web | работает только на нативе |

---

## 5. Web CRA

- `/app/web/build/index.html` готов (11 MB build), заголовок `ATLAS DevOS — operational execution platform`.
- Бэкенд раздаёт через `GET /api/web-ui` и `GET /api/web-ui/{full_path:path}` (SPA fallback).
- React Router v7 (`basename={process.env.PUBLIC_URL}`), Radix UI, Tailwind 3 + craco alias `@ → src`, cookie-based auth.
- **112 страниц** в `src/pages/`.
- PostHog встроен.
- Тема: `localStorage.atlas_theme` (`dark` / `light`).

---

## 6. Зоны риска и открытые баги

### 6.1 🟡 Все интеграции в MOCK

```
StripeConnect adapter  DORMANT — STRIPE_API_KEY missing
PayPalPayouts adapter  DORMANT — PAYPAL_CLIENT_ID/SECRET/WEBHOOK_ID missing
RESEND_API_KEY         not set — email delivery disabled
CLOUDINARY             MOCK mode (files saved locally)
GOOGLE_CLIENT_ID       missing — OAuth unavailable
AI mode=mock           EMERGENT_LLM_KEY есть, но INTEGRATIONS_LIVE_ENABLED!=1
SENTRY_DSN             not set — observability только в `client_errors` collection
```

Для live-mode: положить ключи в `backend/.env` + `INTEGRATIONS_LIVE_ENABLED=1`. Минимум для go-live: `RESEND_API_KEY`, `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, `CLOUDINARY_*`.

### 6.2 🟢 EMERGENT_LLM_KEY подключён

`backend/.env` содержит `EMERGENT_LLM_KEY=sk-emergent-…`. Активация AI требует `INTEGRATIONS_LIVE_ENABLED=1` (политика Этапа 5.0).

### 6.3 🟡 OpenAPI Duplicate Operation ID warnings

10+ warnings о дубликатах `operationId` (`pass_validation`, `fail_validation`, `audit_log`, `list_users_v2`, `block_user`, `unblock_user`, `change_role`, `logout_all`, `soft_delete`, `get_user_detail`). Не блокирует runtime, но `/openapi.json` теряет уникальность ID. Решение — явные `operation_id=` в декораторах.

### 6.4 🟡 ML-стек `sentence-transformers` lazy

Первый запуск backend лениво докачивает `sentence-transformers/all-MiniLM-L6-v2` (~91 MB) через HF Hub без `HF_TOKEN` (warning, не блокирует). Для прод-окружения с rate-limit'ами установить `HF_TOKEN`.

### 6.5 🟡 Pytest не прогонялся

40+ файлов в `backend/tests/`. По запросу — прогоню; часть тестов требует миграции с захардкоженных preview-доменов на `EXPO_PUBLIC_BACKEND_URL` и `asyncio_mode = "auto"` в `pytest.ini`. `pytest-asyncio` не в `requirements.txt`.

### 6.6 🟡 Disk pressure

Volume `/dev/nvme0n5` (9.8 GB) шарится между `/app`, `/root`, `/etc/supervisor`, `/var/log`, `/data/db`. После redeploy: **2.5 GB free** (75% used). `/root/.venv` = 5.6 GB. Любая крупная установка (например, новая PyTorch версия) или web rebuild может вызвать ENOSPC. Рекомендация — не накапливать pip/npm caches.

### 6.7 🟢 Серьёзных регрессий не обнаружено

Money substrate цел, seed идемпотентен, daemons стартуют, healthz/readyz/web-ui/openapi отвечают 200, auth login работает.

---

## 7. Quick-access аккаунты (seed)

| Email | Пароль | Роль |
|-------|--------|------|
| `admin@atlas.dev` | `admin123` | admin |
| `client@atlas.dev` | `client123` | client |
| `john@atlas.dev` | `dev123` | developer |
| `multi@atlas.dev` | `multi123` | developer |
| `tester@atlas.dev` | `tester123` | tester |
| `admin@devos.io` (legacy) | `admin123` | admin |

Plus 6 dev pool аккаунтов (alice / marco / priya / luka / sara / diego, все `dev123`). Полная справка — `/app/memory/test_credentials.md`.

---

## 8. Что нужно от пользователя для следующей итерации

1. **Решить, какие интеграции flip-нуть в `live`** (§6.1):
   - `EMERGENT_LLM_KEY` ✅ уже стоит — нужен только `INTEGRATIONS_LIVE_ENABLED=1`
   - `RESEND_API_KEY` (email/OTP)
   - `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` (хранилище файлов)
   - `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (тестовая оплата — тест-ключи доступны через интеграцию emergent)
   - `SENTRY_DSN` (мониторинг)
2. **Подтвердить приоритет следующей фазы:**
   - a) Закрывать `WEB_STABILIZATION_LINE` (уже SEALED — ничего не надо)
   - b) Expo hardening (deprecated style props, CSS-vars → hex/rgba, permissions manifest)
   - c) Прогнать `pytest` и привести в зелёное
   - d) Flip integrations to live (Stripe / Resend / Cloudinary / Sentry)
   - e) Новая продуктовая фича (forecasting / multi-currency / billing v2 / analytics)
3. **Live-mode flip checklist:** ключи → `INTEGRATIONS_LIVE_ENABLED=1` → `supervisorctl restart backend` → smoke `/api/payouts-v2/health`, `/api/integrations/manifest`.

---

## 9. Изменения в коде в этой сессии

- `backend/.env` — добавлен `EMERGENT_LLM_KEY` (значение из `emergent_integrations_manager`).
- `frontend/yarn.lock` — пересоздан (был исключён из rsync).
- `memory/test_credentials.md` — восстановлен (отсутствовал в репо).
- `audit/AUDIT_2026-FEB_FULL_REDEPLOY_xqr3232323_E1_RU.md` — **этот файл**.

Бизнес-код не трогался. Money substrate не трогался. Sealed layers не трогались.

---

## 10. Чек-лист «всё ли поднялось»

- [x] `supervisorctl status` → `backend RUNNING`, `expo RUNNING`, `mongodb RUNNING`, `nginx-code-proxy RUNNING`
- [x] `curl /api/healthz` → 200 `{"status":"ok"}`
- [x] `curl /api/readyz` → 200 `{"ready":true,"checks":{"mongo":true,"config":true}}`
- [x] `curl /api/web-ui/` → 200 (CRA bundle отдаётся)
- [x] `curl :3000/` (Expo) → 200 (Metro bundle, 1566 modules)
- [x] `POST /api/auth/login admin@atlas.dev/admin123` → 200 + session cookie
- [x] `GET /api/auth/me` (с cookie) → 200, role=admin
- [x] OpenAPI: **732** routes
- [x] Все seed-блоки выполнены (см. §3.3)
- [x] Background daemons стартовали (см. §3.4)
- [x] `/app/memory/test_credentials.md` восстановлен
- [x] Скриншот лендинга EVA-X сохранён (`/tmp/landing.png`)
- [x] Money substrate цел
- [x] `EMERGENT_LLM_KEY` подключён
- [x] Tunnel `Tunnel ready`
- [ ] Flip интеграций в live (ждёт решения пользователя)
- [ ] Pytest прогон (ждёт решения пользователя)

---

## 11. Сервисы и порты (production runtime)

| Сервис | Порт | Команда (supervisor) | Логи |
|--------|------|----------------------|------|
| backend | 8001 | `uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1 --reload` | `/var/log/supervisor/backend.{err,out}.log` |
| expo (Metro tunnel) | 3000 | `yarn expo start --tunnel --port 3000` | `/var/log/supervisor/expo.{err,out}.log` |
| mongodb | 27017 | `mongod --bind_ip_all` | `/var/log/mongodb.{err,out}.log` |
| nginx-code-proxy | 80 | (Kubernetes ingress: `/* → :3000`, `/api/* → :8001`) | — |

**External URL:** `https://mobile-app-expo-15.preview.emergentagent.com`

---

**Аудит зафиксирован. Жду указаний по приоритету (§8).**
