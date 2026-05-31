# Полный аудит после re-deploy — сессия 2026-FEB (E1)

**Репозиторий:** `svetlanaslinko057/7667676767`
**Кодовое имя проекта:** **ATLAS DevOS** (бренд фронтенда — **EVA-X**)
**Workspace:** `/app` (Emergent preview pod)
**Preview host:** `https://react-native-preview-6.preview.emergentagent.com`
**Дата:** 2026-02-FEB (текущая сессия E1)
**Тип:** session restart + full deploy + audit

---

## 0. TL;DR

| Слой | Статус | Комментарий |
|------|--------|-------------|
| Backend (FastAPI + Socket.IO) | ✅ **RUNNING** | `/api/healthz` = 200, `/api/readyz` = `{ready:true}`, **727 endpoint'ов** |
| Mobile (Expo SDK 54, web preview) | ✅ **RUNNING** | Bundled 1566 modules, EVA-X landing рендерится |
| Web client (CRA + craco) | ✅ **SERVED** | `/api/web-ui/` отдаёт `200`, билд уже в `web/build` |
| MongoDB | ✅ **RUNNING** | ping ok, сидинг отрабатывает |
| Все интеграции | 🔶 **MOCK / DORMANT** | Stripe, PayPal, Resend, Cloudinary без ключей |
| Туннель (ngrok / Expo Go) | ⚠️ Был сбой | Сейчас "Tunnel ready", сбои Premature close в логах ранее |
| Диск | ✅ **OK** | `9.8G total, 2.3G used (23%), 7.6G free` |

**Проект развёрнут полностью. Все три плоскости (Backend / Mobile / Web) отвечают 200. Готов к продолжению разработки.**

---

## 1. Что было сделано в этой сессии

### 1.1. Загрузка кода из GitHub
- В `/app` был **только стартовый Expo-шаблон** (server.py с одним `/status` эндпоинтом, пустой `app/index.tsx`, README "Here are your Instructions").
- Реальное содержимое (ATLAS DevOS) лежало в `origin/main` GitHub-репозитория, но не было синхронизировано в pod.
- Действия:
  ```bash
  git remote add origin https://github.com/svetlanaslinko057/7667676767.git
  git fetch origin main
  cp backend/.env frontend/.env → /tmp (backup)
  git reset --hard origin/main
  ```
- Теперь `/app` содержит полный код: `backend/` (173 py-файла), `frontend/` (97 tsx-файлов), `web/` (94 React-страницы), `audit/`, `docs/`, `memory/`, `packages/`, `scripts/`, `tools/`, `tests/`, `design_guidelines.json`, `test_result.md`.

### 1.2. Зависимости backend
Установлены недостающие Python-пакеты (тяжёлая часть `requirements.txt` — torch, sentence-transformers и т.п. — НЕ установлены, бэкенд работает без них через graceful fallback):

```bash
pip install python-socketio==5.16.1 litellm slowapi
pip install resend pyotp qrcode cloudinary reportlab
```

Ключевые уже стоящие: `emergentintegrations 0.1.2`, `litellm 1.80.0`, `stripe 14.4.1`, `google-genai 2.6.0`, `motor 3.3.1`, `pydantic 2.x`, `pandas 3.x`, `numpy 2.4.x`.

### 1.3. Зависимости frontend
`package.json` объявил новые expo-плагины (`expo-audio`, `expo-image-picker`, `expo-location`, `expo-notifications`, и т.д.), которых не было в node_modules.
```bash
cd /app/frontend && yarn install --network-timeout 600000
```
Lockfile сохранён, все 48 deps на месте.

### 1.4. Исправленные баги при старте
1. **Backend**: отсутствовали `python-socketio`, `slowapi`, `litellm`, `resend`, `pyotp`, `qrcode`, `cloudinary`, `reportlab`. Без них процесс падал на импортах. Установлено.
2. **Frontend**: `app/admin/home.tsx` содержал **повреждённый хвост файла** (строки 375-383 — мусор от плохого мержа: `ndColor: T.surface2,` и дубликаты ключей). Это блокировало бандл Metro. **Исправлено** (см. `git diff`).
3. **Metro cache**: очищен `/app/frontend/.metro-cache` и `.expo/cache`.

### 1.5. Сохранённые `.env`
Из protected списка:
- `backend/.env`: `MONGO_URL=mongodb://localhost:27017`, `DB_NAME=test_database`
- `frontend/.env`: `EXPO_PACKAGER_HOSTNAME`, `EXPO_PUBLIC_BACKEND_URL`, `EXPO_TUNNEL_SUBDOMAIN`, `EXPO_PACKAGER_PROXY_URL`, `METRO_CACHE_ROOT`, `EXPO_USE_FAST_RESOLVER`

Все указывают на `react-native-preview-6.preview.emergentagent.com`.

### 1.6. Сидинг при старте бэкенда
Автоматически создаётся при первом старте:
- Mock payment providers, 1 admin user
- 5 quick-access пользователей: `admin@`, `john@`, `client@`, `multi@`, `tester@atlas.dev`
- 6 dev-pool девелоперов (alice / marco / priya / luka / sara / diego — все грейды)
- 89 модулей, 81 QA-решение, 6 канонических money-state
- Демо-проект `Acme Analytics Platform` для `client@atlas.dev` (3 модуля)
- `mock_seed`: 2 проекта, 7 модулей, 6 earnings, 6 invoices, 2 deliverables, 3 tickets, 3 notifications, 7 cognition_actions
- `seed_replay boot_replay_v1` (14 дней / medium, 70 событий: 16 overrides, 14 qa_fail, 19 reassign, 12 overload, 9 suppression)
- Tester seed: 5 валидаций + 1 issue
- 4 scope templates, system_config, индексы money_ledger / competitor cache / validation campaigns

---

## 2. Архитектура — что есть в репо

### 2.1. Backend (`/app/backend`)
- **173 `.py` файла**, главный — `server.py` (~27 500 строк, мега-роутер + бизнес-логика).
- **727 endpoint'ов** (по OpenAPI). Топ-15 групп:

| Группа | Endpoint'ов |
|--------|-------------|
| `/api/admin/*` | **259** |
| `/api/developer/*` | 73 |
| `/api/client/*` | 66 |
| `/api/modules/*` | 23 |
| `/api/account/*` | 23 |
| `/api/payouts-v2/*` | 22 |
| `/api/execution-intelligence/*` | 19 |
| `/api/auth/*` | 18 |
| `/api/ai/*` | 13 |
| `/api/contracts/*` | 12 |
| `/api/system/*` | 10 |
| `/api/mobile/*` | 10 |
| `/api/projects/*` | 8 |
| `/api/validation/*` | 8 |
| `/api/provider/*` | 8 |

- **Domain layers:** `domains/money/` (events / models / policies / service), `infrastructure/db/repositories/` (base / users / projects / modules / money), `integrations/` (boundary с registry + live_adapters + mocks), `payment_providers/` (stripe / wayforpay / mock), `middleware/` (request_id, error_shape, compat_observability), `shared/` (config / constants / errors / events / logging).
- **Money substrate** (Phase 2A → 2C завершены по audit-отчётам):
  - `money_runtime`, `money_ledger`, `money_bridge`, `money_replay`, `money_projections`, `money_divergence`
  - `escrow_layer`, `escrow_api`, `client_escrow`, `earnings_layer`, `payout_layer`, `payouts_v2*`
  - `dev_wallet_reader` (canonical R/W switch завершён, B4 acceptance подписан)
- **Background daemons:** `overdue_daemon`, `auto_guardian` (loop 120s), `module_motion` (loop 15s), `team_balancer` (cycle every 2 min), `payouts_v2_reconciler` (1800s), `event_engine` scanner (15 min), `operator_engine` scheduler (300s), `legal_contract reminder` (21600s).
- **Realtime:** Socket.IO mounted at `/api/socket.io` (через ASGI-wrapping вокруг FastAPI). Rooms: `user:<id>`, `role:<role>`, `project:<id>` с авторизацией по session_token.
- **Health & ops:** `/api/healthz` (instant), `/api/readyz` (Mongo ping + config), Sentry init опционален, RequestId middleware, slowapi rate limiter.

### 2.2. Frontend (Expo, `/app/frontend`)
- **97 `.tsx` файлов в `app/`** + ~50 модулей в `src/`.
- **Expo SDK 54.0.34**, expo-router 6.0.22, React 19, React Native 0.81.5, новая архитектура (`newArchEnabled: true`), Reanimated 4, Worklets 0.5.
- **Структура `app/`** (file-based routing):
  - Корневой стек: `index`, `auth`, `gateway`, `hub`, `account`, `profile`, `settings`, `chat`, `inbox`, `activity`, `help`, `documents`, `describe`, `estimate-result`, `estimate-improve`, `operator`, `project-booting`, `two-factor-challenge`, `two-factor-recovery`
  - Surfaces: `admin/`, `client/`, `developer/`, `tester/`, `operator/`, `project/`, `contract/`, `lead/`, `help/`
- **Провайдеры (`_layout.tsx`):** `AuthProvider`, `AuthGateProvider`, `FeedbackProvider`, `StateShiftProvider`, `ValidatorProvider`, `I18nProvider`, `ThemeProvider`, `SafeAreaProvider` + global `AppHeader`/`BottomTabs`.
- **Runtime:** capability manifest fetch с timeout 1.5 сек (`runtime.capabilities.refresh`), глобальный error reporter (`installGlobalErrorReporter`).
- **i18n, темы:** свой движок (`src/i18n.tsx`, `src/theme.ts`, `src/theme-context.tsx`, `src/design-tokens.ts`).

### 2.3. Web (React CRA + craco, `/app/web`)
- **CRA 5 + craco** (alias `@ → src`), Tailwind 3 + Radix UI primitives, React Router v7 (`basename={process.env.PUBLIC_URL}`), cookie-based auth (`withCredentials: true`).
- **94 страницы** в `src/pages/`. Билд уже собран в `/app/web/build/` и **сервится бэкендом** под `/api/web-ui/*` — это важный архитектурный приём: один ingress rule (`/api/* → backend`) покрывает всё.
- Endpoints, к которым подключены страницы: `/api/client/costs`, `/api/client/operator`, `/api/client/project/{id}/workspace`.

### 2.4. Документация (`/app/audit`, `/app/docs`)
- Аудиты предыдущих фаз — `audit/AUDIT_2026-02-FEB_FULL_REDEPLOY_AND_AUDIT.md`, `audit/PHASE_2C_B*_ACCEPTANCE_*`, `PHASE_2A_MONEY_DOMAIN_CLOSEOUT`, `MONEY_STATE_MACHINE.md`, `RUNTIME_CLIENT_MIGRATION_COMPLETE.md`, `WEB_P2/P3_CLOSEOUT.md` и т.п. — всё в наличии.
- `docs/operational-*-charter.md`, `docs/product-scope-freeze*.md`, `docs/synthetic_corpus*`, `docs/pricing-reality-layer-iteration-3-charter.md`.
- `design_guidelines.json` (10 KB) — спецификация UI.

### 2.5. Тесты
- **40 файлов в `backend/tests/`** (architecture layering, integration contracts, money runtime, divergence observer, escrow/withdrawal/payout v2, OTP, two factor, legal contract, reputation decay, dev wallet projection, и т.д.).
- Запустить можно через `pytest` (нужно докинуть `pytest-asyncio`, если будет требоваться).

---

## 3. Текущее runtime-состояние (live)

### 3.1. Supervisor
```
backend        RUNNING   uvicorn server:app --reload  (port 8001)
expo           RUNNING   yarn expo start --tunnel --port 3000
mongodb        RUNNING   /usr/bin/mongod --bind_ip_all
code-server    RUNNING
nginx-code-proxy RUNNING
```

### 3.2. Health probes
```
GET /api/healthz   → 200 {"status":"ok"}
GET /api/readyz    → 200 {"ready":true,"checks":{"mongo":true,"config":true}}
GET /api/          → 200 {"message":"Development OS API","version":"1.0.0"}
GET /api/web-ui/   → 200 (CRA build served by backend)
```

### 3.3. Integration health (live console)
```
StripeConnect adapter  DORMANT — STRIPE_API_KEY missing
PayPalPayouts adapter  DORMANT — PAYPAL_CLIENT_ID/SECRET/WEBHOOK_ID missing
RESEND_API_KEY         not set — email delivery disabled (mock mode)
CLOUDINARY             MOCK mode (no API keys — files saved locally)
auth_otp               mail_provider=mock-mail mail_mode=mock
sentence_transformers  module not installed — embeddings disabled, templates fallback to heuristic
```

Это **корректное безопасное состояние** до выставления `INTEGRATIONS_LIVE_ENABLED=1` + реальных ключей.

### 3.4. Активные фоновые петли
- Module motion (15 s)
- Operator scheduler (5 min)
- Auto-guardian (2 min) — уже автопаузнул `project=31701c54`
- Team balancer (2 min)
- Payouts v2 reaper (30 s), mock advancer (5 s)
- Payouts v2 reconciler (30 min) — `recon_f264c510140d scanned=0 discrepancies=0`
- Event engine scanner (15 min)
- Legal contract reminder (6 h)

---

## 4. Известные риски и пробелы

| # | Категория | Проблема | Влияние | Приоритет |
|---|-----------|----------|---------|-----------|
| R1 | Mobile (Expo Go) | В логах `expo.err.log` повторяющиеся `Premature close` от ngrok, ранее были crash'ы тоннеля при старте | На вебе работает, но реальное устройство по QR может время от времени отваливаться | Medium |
| R2 | LLM embeddings | `sentence_transformers` не установлен (170+ Mb torch) — отключаем semantic-поиск шаблонов | Templates падают в keyword fallback (на проде нужно либо тяжёлый install, либо emergent embeddings endpoint) | Medium |
| R3 | Money / Payments | Stripe + WayForPay + PayPal в DORMANT-режиме | На проде нужно `INTEGRATIONS_LIVE_ENABLED=1` + ключи + smoke `/api/payouts-v2/health` | High (для go-live) |
| R4 | Email | Resend / mock-mail | Все OTP / verification fall back в логи | High (для onboarding) |
| R5 | Storage | Cloudinary в MOCK-режиме (локальный диск) | После рестарта пода файлы теряются | Medium |
| R6 | Code hygiene | `app/admin/home.tsx` — был corrupted tail; auto-merge оставил мусор. Возможны другие подобные места — нужен полный lint-pass. | Может ломать бандл фронта | High |
| R7 | Disk | `/dev/nvme0n4` 9.8 G total / 2.3 G used (23 %). При установке полного `requirements.txt` (torch+cuda+sentence-transformers) пик может выбить out-of-space. | На текущем состоянии — норм | Low |
| R8 | Auth | OTP в mock-моде, JWT pyjwt установлен, two_factor / google_auth есть | Авторизация работает только для seed-юзеров `*@atlas.dev` | High (для прода) |
| R9 | server.py монолит | 27 500 строк в одном файле | Усложняет review/merge, любая случайная "паста" может ломать импорт | Medium (рефактор уже идёт — см. `ARCHITECTURE_DECOMPOSITION_AUDIT_2026-05-19.md`) |
| R10 | Tests | 40 файлов есть, но не запущены в этой сессии | Нет подтверждения, что зелёные после re-deploy | Medium |

---

## 5. Quick-access аккаунты (seed)

| Email | Роль | Цель |
|-------|------|------|
| `admin@atlas.dev` | admin | системный кокпит, money authority |
| `client@atlas.dev` | client | дашборд клиента (Acme Analytics Platform) |
| `john@atlas.dev` | developer | основной dev-кейс |
| `multi@atlas.dev` | developer | multi-project dev |
| `tester@atlas.dev` | tester | QA surface |

Пароли — см. seed-скрипт в `mock_seed.py` / `server.py` (стандартные quick-access, без OTP в DEV-mode).

---

## 6. Что готово к продолжению разработки

✅ Можно сразу:
- Открыть `client@atlas.dev` и пройти flow Describe → Estimate → Operator → Workspace
- Открыть `admin@atlas.dev` и зайти в admin cockpit (`/api/admin/*` 259 endpoint'ов + 100+ tsx-страниц)
- Открыть `developer@atlas.dev` (`john@`) и работать с модулями / акцептом / time tracking
- Тестировать money substrate (escrow / withdrawals / payouts v2) — всё в mock-mode
- Делать smoke-тесты на любых из 727 endpoint'ов

⏳ Чтобы flip в live-mode:
1. Положить ключи в `backend/.env`: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_*`, `PAYPAL_*`, `WAYFORPAY_*`
2. Выставить `INTEGRATIONS_LIVE_ENABLED=1` (см. `integrations/registry.py`)
3. Прогнать `pytest backend/tests/` (после `pip install pytest-asyncio`)
4. Опционально доустановить `sentence-transformers` для semantic-search

---

## 7. Изменения в коде в этой сессии (git diff sketch)

- `app/admin/home.tsx` — удалены строки 375-383 (мусорный хвост, ломавший Metro)

Всё остальное — установка зависимостей + рестарты supervisor. Бизнес-код не трогался.

---

**Готово. Можно продолжать разработку — жду конкретные задачи (фичи / багфиксы / refactor / data model изменения).**
