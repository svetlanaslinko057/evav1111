# Полное развёртывание и аудит — 2026-05-30

**Репозиторий:** `svetlanaslinko057/78588857`
**Проект:** ATLAS DevOS (фронт-бренд **EVA-X**)
**Среда:** Emergent workspace `/app`
**Сессия E1:** full redeploy + audit, MOCK-режим интеграций
**Предыдущий аудит:** `AUDIT_2026-02-FEB_FULL_REDEPLOY_AND_AUDIT.md` (от 2026-02-FEB)

---

## 0. TL;DR

| Слой | Состояние | Комментарий |
|------|-----------|-------------|
| Backend (FastAPI) | ✅ RUNNING | 741 endpoint, lifespan ok, MongoDB подключён, все сидеры прошли |
| Mobile (Expo) | ✅ RUNNING | Tunnel ok, web preview рендерит лендинг EVA-X (51 KB HTML, 1563 модуля собрано) |
| Web (CRA + craco) | ⚠️ NOT BUILT | `/app/web/build` отсутствует; не сервится |
| MongoDB | ✅ RUNNING | Сидинг проходит (6 dev pool, 89 модулей, 81 QA, 5 валидаций, 70 replay-событий) |
| Интеграции | 🔶 MOCK | `INTEGRATIONS_LIVE_ENABLED` не выставлен, все live-адаптеры дормантны |
| Тесты | ⚠️ ЧАСТИЧНО | `pytest-asyncio` не установлен → async-тесты падают |
| Disk (`/dev/nvme0n15` = 9.8 GB) | ⚠️ TIGHT | 71% после установки backend + frontend + sentence-transformers |

**Готово к продолжению разработки.** Базовые потоки (auth quick-login, money substrate, escrow, validation campaigns) запускаются. Live-flip гейтится только наличием ключей.

---

## 1. Что было сделано в этой сессии

### 1.1. Развёртывание из GitHub
- Стартовое `/app` содержало только Expo-template. Полное содержимое репозитория **не было загружено**.
- Клонировал `svetlanaslinko057/78588857` в `/tmp/repo` (depth 1), синхронизировал в `/app` через `rsync -a` с защитой:
  - `--exclude='.git'` (сохранён родной .git)
  - `--exclude='.emergent'` (платформенный)
  - `--exclude='backend/.env'` и `--exclude='frontend/.env'` (сохранены оригинальные значения `MONGO_URL`, `DB_NAME`, `EXPO_PACKAGER_*`, `EXPO_PUBLIC_BACKEND_URL`)
  - `--exclude='node_modules'`
- Перенесены: `audit/` (90 .md), `backend/` (91 .py), `docs/`, `frontend/`, `memory/`, `packages/`, `scripts/`, `test_reports/`, `tools/`, `web/`, корневые `design_guidelines.json`, `test_result.md`.

### 1.2. Зависимости
- **Backend:** `pip install -r backend/requirements.txt` (149 пакетов: litellm, emergentintegrations, motor, slowapi, stripe, python-socketio, resend, google-genai, torch, pyotp, bcrypt и др.). Импорты резолвятся.
- **`sentence-transformers` отсутствовал в requirements** — но `server.py:17294` использует его для embedding scope-templates. Поставил `pip install --no-cache-dir sentence-transformers==5.5.1`. После этого embedding errors при сидинге исчезли.
- **Frontend:** `yarn install` (49 dependencies, ~500 MB node_modules). Lockfile пересоздался (был свежий sync).

### 1.3. Дисковые операции
- Volume `/dev/nvme0n15` (9.8 GB, разделён между `/app` и `/root`) после первичной установки заполнился до **100%** → `ENOSPC` при попытке поставить `sentence-transformers`.
- Очистил `/root/.cache/pip` (2.9 GB) и `/app/frontend/.metro-cache` (334 MB). Освобождено **~3.3 GB**.
- После установки sentence-transformers + torch и повторной очистки pip-кэша диск = **71%** (6.9 GB used / 9.8 GB).

### 1.4. Сервисы
Все supervisor-сервисы перезапущены и стабильны:

```
backend          RUNNING  uvicorn server:app --host 0.0.0.0 --port 8001 --reload
expo             RUNNING  yarn expo start --tunnel --port 3000 (CI=true)
mongodb          RUNNING  mongod --bind_ip_all
nginx-code-proxy RUNNING  ingress / → :3000, /api/* → :8001
code-server      RUNNING  (опционально, IDE)
```

### 1.5. Сидинг (boot lifespan)
Подтверждено в логах:
- 5 quick-access users: `admin@`, `john@`, `client@`, `multi@`, `tester@atlas.dev`
- 6 dev pool (alice/marco/priya/luka/sara/diego)
- 89 модулей, 81 QA-решений, 6 канонических money_states
- Демо-проект `Acme Analytics Platform` для client@atlas.dev (3 модуля)
- `mock_seed`: 2 проекта, 7 модулей, 6 earnings, 6 invoices, 2 deliverables, 3 tickets, 3 notifications, 7 cognition_actions
- `seed_replay` boot_replay_v1: 14 дней, 70 событий (16 overrides / 14 qa_fail / 19 reassign / 12 overload / 9 suppression)
- Tester seed: 5 валидаций + 1 issue → tester@atlas.dev
- L0/L1 backfill для модулей и users
- Notifications seed: 5+3+3 demo
- 4 scope templates (с эмбеддингами после фикса sentence-transformers)
- Integrations seed: wayforpay, stripe, app, payments

### 1.6. Smoke-проверки
```
GET  /api/healthz                            → 200 {"status":"ok"}
POST /api/auth/quick {"email":"admin@atlas.dev"} → 200 user{role:admin, ...}
GET  /openapi.json                            → 200 (741 paths)
GET  http://localhost:3000                    → 200 (51 KB SSR'd Expo Router)
Public preview (EVA-X landing)                → rendered, корректный hero
```

---

## 2. Архитектура (текущий снимок кода)

### 2.1. Backend `/app/backend` — 91 .py файл, `server.py` = 28 221 строка

Группы модулей (без изменений с предыдущего аудита):

| Группа | Ключевые модули |
|--------|-----------------|
| Auth / Identity | `auth_otp.py`, `two_factor.py`, `google_auth.py`, `account_layer.py` |
| Money substrate (2A/2B/2C) | `money_runtime.py`, `money_ledger.py`, `money_bridge.py`, `money_replay.py`, `money_projections.py`, `money_divergence.py`, `escrow_layer.py`, `escrow_api.py`, `client_escrow.py`, `payout_layer.py`, `earnings_layer.py`, `dev_wallet_reader.py`, `domains/money/*` |
| Payouts V2 | `payouts_v2.py`, `payouts_v2_api.py`, `payouts_v2_worker.py`, `payouts_v2_reconciler.py` (worker, reaper, mock advancer, scheduler — все запускаются в lifespan) |
| Acceptance / assignment | `acceptance_layer.py`, `assignment_engine.py`, `decision_layer.py`, `decomposition_engine.py`, `client_acceptance.py` |
| Work execution | `work_execution.py`, `module_execution.py`, `module_motion.py`, `dev_work.py`, `event_engine.py`, `time_tracking_layer.py` |
| Intelligence / brains | `developer_brain.py`, `developer_intelligence.py`, `team_intelligence.py`, `intelligence_layer.py`, `intelligence_api.py`, `revenue_brain.py`, `execution_intelligence.py`, `competitor_analyzer.py` |
| Admin (cockpit + расширения) | `admin_actions.py`, `admin_control.py`, `admin_integrations.py`, `admin_llm_settings.py`, `admin_mobile.py`, `admin_production.py`, `admin_risk.py`, `admin_system.py`, `admin_team.py`, `admin_users_layer.py` |
| Client surface | `client_workspace.py`, `client_operator.py`, `client_operator_opportunities.py`, `client_costs.py`, `client_transparency.py` |
| Team / operator | `team_api.py`, `team_balancer.py`, `team_layer.py`, `operator_engine.py` |
| Pricing / market | `pricing_engine.py`, `market_bootstrap.py`, `validation_campaigns.py` |
| Integrations (boundary) | `integrations/{base,registry,mocks,live_adapters,ai,mail,oauth,payment,storage}`, `cloudinary_service.py`, `email_service.py`, `stt_service.py`, `push_sender.py` |
| Payment providers | `payment_providers/{base,mock,stripe_provider,wayforpay}` |
| Compat / mobile bridge | `compat_routes.py`, `mobile_adapter.py`, `etap3_routes.py` |
| Background daemons | `overdue_daemon.py`, `overdue_engine.py`, `auto_guardian.py`, `reputation_decay.py`, `flow_control.py`, `legal_contract_layer.py` (contract reminder loop) |
| Shared / infra | `shared/`, `middleware/`, `infrastructure/db/repositories/*`, `api/adapters/web_adapter.py`, `domains/`, `services/` |

**Endpoint-карта (741 paths, актуально на сегодня):**
```
/api/admin/*                  265
/api/developer/*               73
/api/client/*                  66
/api/modules/*                 23
/api/account/*                 23
/api/payouts-v2/*              22
/api/execution-intelligence/*  19
/api/auth/*                    18
/api/ai/*                      13
/api/contracts/*               12
/api/system/*                  10
/api/mobile/*                  10
/api/projects/*                 8
/api/validation/*               8
/api/provider/*                 8
+ escrow / billing / marketplace / tester / two-factor / integrations / healthz …
```

Прирост к предыдущему аудиту (688 → 741) приходится в основном на `/api/payouts-v2/*` (22 новых) и расширение `/api/admin/*` (251 → 265).

### 2.2. Frontend Expo `/app/frontend` — 36 файлов/папок в `app/`

```
app/
├── _layout.tsx, +html.tsx, index.tsx
├── auth.tsx, gateway.tsx, two-factor-challenge.tsx, two-factor-recovery.tsx
├── account.tsx, profile.tsx, settings.tsx, documents.tsx
├── activity.tsx, chat.tsx, inbox.tsx, hub.tsx, operator.tsx
├── describe.tsx, estimate-improve.tsx, estimate-result.tsx, project-booting.tsx
├── admin/        (_layout, home, master, control, team, users, finance, qa,
│                  marketplace, contracts, templates, integrations, validation,
│                  execution-console, inbox, projects/, profile, payouts,
│                  payout-batch/, portfolio, reconciliation)  ── 21 экран
├── client/       workspace, billing, contract, deliverable, control, activity, …
├── developer/    полная dev-поверхность
├── tester/       _layout, home, validations, validation/, mission/, history  ── Stage 4
├── operator/, lead/(workspace), contract/, project/, help/, workspace/
```

`packages/design-system` (своя DS) и `packages/runtime-client` (общий рантайм для web+mobile) подключены.

### 2.3. Web `/app/web` — React 18 CRA + craco + Tailwind + Radix
- 243 файла `.js/.jsx/.tsx/.ts`
- ⚠️ **`build/` отсутствует.** `WEB_BUILD_DIR` пуст, веб-админка не сервится.
- Для активации: `cd /app/web && yarn install && yarn build`. Нужно ~1.5–2 GB free disk + проверить `web/.env`.

### 2.4. Документация
- `/app/audit/` — **90 .md файлов** (контракты, чартеры, фазовые close-out'ы Phase 0 → 2A → 2B → 2C B1-B4/D, smoke-trace'ы, governance).
- `/app/docs/` — product-scope-freeze + amendment 1, runtime-contracts, синтетический корпус и 100 findings.
- `test_result.md`, `design_guidelines.{json,md}` в корне.

---

## 3. Аудит конфигурации и интеграций

### 3.1. ENV

**`backend/.env`** содержит только:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
```

Отсутствующие/MOCK ключи (важно перед live-flip):
- `RESEND_API_KEY` → email отключён (mock-mail)
- `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` → файлы сохраняются локально
- `STRIPE_SECRET_KEY` (есть test-key в pod env, можно подхватить)
- `WAYFORPAY_*` → mock payment provider
- `GOOGLE_CLIENT_ID/SECRET` → google_auth dormant
- `EMERGENT_LLM_KEY` → нужен для litellm/emergentintegrations (Claude/GPT/Gemini)
- `HF_TOKEN` → опционально, ускоряет HF download
- `INTEGRATIONS_LIVE_ENABLED` → **не задан** → все live-адаптеры дормантны (по контракту)

**`frontend/.env`** — корректно: защищённые `EXPO_PACKAGER_PROXY_URL`, `EXPO_PACKAGER_HOSTNAME`, `EXPO_TUNNEL_SUBDOMAIN`, `METRO_CACHE_ROOT`, `EXPO_PUBLIC_BACKEND_URL`, `EXPO_USE_FAST_RESOLVER`. Не модифицировались.

### 3.2. Boundary-слой
- `integrations/registry.py` — единая точка получения провайдеров.
- `integrations/mocks.py` — детерминированные моки (всегда доступны).
- `integrations/live_adapters.py` — обёртки над Stripe / WayForPay / Cloudinary / Resend / Google OAuth / emergentintegrations.
- Активация требует **И** `INTEGRATIONS_LIVE_ENABLED=1` **И** наличия ключей. Иначе — mock с честным `reason`.
- Бизнес-логика не вызывает SDK напрямую → live-flip это **одна переменная окружения + ключи**.

### 3.3. LLM
`server.py` импортирует `litellm`, `emergentintegrations.llm.chat.LlmChat`, `emergentintegrations.llm.utils.get_integration_proxy_url`. `INTEGRATION_PROXY_URL=https://integrations.emergentagent.com` уже в supervisord. Активация — выдать `EMERGENT_LLM_KEY`.

---

## 4. Аудит стабильности

### 4.1. Boot-последовательность (последний рестарт, OK)
```
auth_otp     INFO  AUTH OTP init: DEV_MODE=False mail_provider=mock-mail mail_mode=mock
cloudinary   INFO  CLOUDINARY: MOCK mode
server       INFO  Seeded mock providers, portfolio cases, admin user, 5 quick-access users
server       INFO  DEV POOL: 6 devs, 89 modules, 81 qa decisions, 6 canonical money states
server       INFO  Seeded demo project 'Acme Analytics Platform' (3 modules)
mock_seed    INFO  MOCK SEED: 2 projects, 7 modules, 6 earnings, 6 invoices, 2 deliverables, 3 tickets, 3 notifications, 7 cognition_actions
seed_replay  INFO  SEED_REPLAY label=boot_replay_v1 events=70 …
server       INFO  TESTER SEED: 5 validations + 1 issue → tester@atlas.dev
server       INFO  Seeded 4 scope templates                       ← ✅ без embedding errors
event_engine INFO  EVENT ENGINE: Background scanner started (15 min)
payouts_v2   INFO  PAY-V2 worker / reaper / mock-advancer / scheduler all started
money_bridge INFO  MONEY BRIDGE: MoneyService initialised (Phase 2B PR-1)
auto_guardian INFO GUARDIAN: loop started (interval 120s)
module_motion INFO MODULE MOTION: loop started (interval 15s)
operator_engine INFO OPERATOR SCHEDULER: started (300s interval)
legal_contract  INFO CONTRACT REMINDER LOOP: started (interval 21600s)
INFO: Application startup complete.
```

### 4.2. Background-loop'ы (все активны)

| Daemon | Интервал | Назначение |
|--------|----------|------------|
| Event engine scanner | 15 мин | Детектирование событий по модулям |
| Auto-guardian | 120 с | Money/escrow guardrails |
| Module motion | 15 с | Перемещение модулей по статусам |
| Operator scheduler | 300 с | Назначение и балансировка |
| Pay-V2 worker | 5 с | Обработка очереди выплат |
| Pay-V2 reaper | 30 с | Lease-expired records |
| Pay-V2 mock advancer | 5 с | Симуляция провайдера в mock |
| Pay-V2 scheduler | 900 с | Периодические задачи |
| Legal contract reminder | 21600 с (6ч) | Reminders по контрактам |
| Overdue daemon | cron | Просрочки (run_overdue_check.sh) |

### 4.3. Warning'и / низкоприоритетные находки

| Категория | Severity | Контекст |
|-----------|----------|----------|
| Duplicate OperationID в OpenAPI (10+ случаев в `admin_users_layer.py` и `validation`) | LOW | Дублируются префиксы; OpenAPI всё равно резолвится |
| RN-web warnings: `var(--t-primary)44` в `borderColor`, `shadow*`, `pointerEvents` | WARN | Не блокирует, засоряет логи |
| `expo-notifications: push token changes not supported on web` | INFO | Push работает только на нативе |
| uvicorn `--reload` watch list ~150 файлов | INFO | Dev-only, в проде убрать |
| `pytest-asyncio` не установлен | LOW | Async-тесты не запускаются |
| Sentence-transformers первый download (~91 MB) | RESOLVED | Установлен в этой сессии |
| Ngrok tunnel был «took too long» в старых строках | RESOLVED | Текущий tunnel connected |

### 4.4. Smoke-тесты

```bash
$ curl -s http://localhost:8001/api/healthz
{"status":"ok"}

$ curl -s -X POST http://localhost:8001/api/auth/quick \
       -H "Content-Type: application/json" \
       -d '{"email":"admin@atlas.dev"}'
{"isNew":false,"user":{"user_id":"user_9d57a1050bac","email":"admin@atlas.dev",
  "role":"admin","roles":["admin"],"active_role":"admin","level":"senior",
  "tier":"starter","rating":5.0,"password_hash":"$2b$12$…", …}}

$ curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
200

$ Public preview → EVA-X landing rendered (hero, sequence steps, "See my product plan" CTA)
```

---

## 5. Соответствие frozen-scope (`docs/product-scope-freeze.md`)

| Decision | Состояние |
|----------|-----------|
| **D1** — Expo admin = operational cockpit (5 экранов) | ⚠️ Превышено — фактически 21 экран в `app/admin/` (включая team, users, master, marketplace, contracts, templates, integrations, execution-console, reconciliation, payouts, portfolio). См. `docs/product-scope-freeze-amend-1.md` от 2026-05-19, который частично легализует 8 read-mostly drill-down'ов. Текущее количество всё ещё **превышает amendment scope (5 + 8 = 13)**. |
| **D2** — Expo tester = Stage 4 (4 экрана) | ✅ Структура `app/tester/` соответствует (home, validations, validation/, mission/, history). Бэкенд `/api/tester/* × 5` + `/api/validation/* × 8` готов, тестер сидируется. |
| **D3** — Lead = conversion surface only | ✅ Только `app/lead/workspace.tsx`. Отдельной роли в auth нет. |

⚠️ **Расхождение D1 нужно или легализовать вторым amendment, или гейтить часть admin-экранов фичефлагом**.

---

## 6. Money substrate (контракт/состояние)

Согласно `audit/MONEY_SUBSTRATE_COMPLETION_MILESTONE.md` и `SUBSTRATE_SEALING_REVIEW_SIGNOFF.md` substrate **запечатан**:

- Single source of truth: `domains/money/service.py`
- Канонические money_states (escrow / earnings / payout) сидируются для 6 dev pool пользователей при boot.
- Bridges: `PHASE_2B_PR1_ESCROW_BRIDGE`, `PR2_EARNINGS_BRIDGE`, `PR3_PAYOUT_BRIDGE` зафиксированы.
- Phase 2C: B1 (dev_wallets projection) → B2/B3 (stability + read switch) → B4.0…B4.5 acceptance → writer removal plan.
- Divergence Observer (B4.5, passive): `money_divergence.py` + `DIVERGENCE_PASSIVE_OBSERVER_CONTRACT.md`.
- Replay backfill (Phase 2C D): `seed_replay` boot_replay_v1 крутится при сидинге (verified в логах).

Новинка с предыдущего аудита: добавлен **Payouts V2** слой (`payouts_v2*` × 4 файла, 22 endpoint'а), c полной background-инфраструктурой (worker/reaper/mock-advancer/scheduler). Документации в `/app/audit/PAYOUTS_V2_*.md` пока нет — рекомендую зафиксировать контракт.

---

## 7. Найденные проблемы и рекомендации

### 7.1. Критические (блокируют next milestone)

| # | Проблема | Рекомендация |
|---|----------|--------------|
| C1 | Веб-клиент не собран — `/app/web/build/` отсутствует | `cd /app/web && yarn install --network-timeout 600000 && yarn build`. Учесть рост `/app` (нужно ~1.5–2 GB свободного места). |
| C2 | Диск `/dev/nvme0n15` (9.8 GB) занят на 71% после установки | Не возвращать удалённые pip/npm caches; до web-build освободить ещё `/root/.cache`, `/tmp`, неиспользуемые HF-веса. |

### 7.2. Важные (до live-flip)

| # | Проблема | Рекомендация |
|---|----------|--------------|
| W1 | Все интеграции в MOCK | Перед прод-флагом собрать ключи и заполнить `backend/.env`. Live-flip = `INTEGRATIONS_LIVE_ENABLED=1` + ключи. |
| W2 | Expo admin превышает frozen-scope D1 (21 экран vs allowed 5+8) | (a) Amendment #2 с операционным обоснованием, или (b) feature-flag-gate лишних экранов. |
| W3 | `sentence-transformers` отсутствует в `requirements.txt` (но используется) | Запустить `pip freeze > requirements.txt` или явно добавить `sentence-transformers==5.5.1` в requirements. |
| W4 | `pytest-asyncio` не установлен → async-тесты падают | Добавить `pytest-asyncio==0.23.*` в requirements. |
| W5 | Payouts V2 — нет контракт-документа в `/app/audit/` | Закрепить state machine, semantics и blast radius (по образцу `MONEY_STATE_MACHINE.md`). |

### 7.3. Косметика

| # | Проблема | Рекомендация |
|---|----------|--------------|
| M1 | Duplicate OperationID warnings (10+) в OpenAPI | Расставить уникальные `operation_id=` в декораторах роутов. |
| M2 | RN-web warnings (`var(--t-primary)44` в `borderColor`, `shadow*`, `pointerEvents`) | Прогнать DS через линтер, заменить CSS-vars на статический hex. |
| M3 | uvicorn `--reload` watch list ~150 файлов | На staging — отключить `--reload`, использовать `gunicorn_conf.py`. |
| M4 | `/api/auth/me` для гостя логируется как ошибка фронтом | Перевести на silent-401. |
| M5 | `server.py` = 28 221 строка (выросла на ~850 строк с прошлого аудита) | Продолжить декомпозицию по плану `ARCHITECTURE_DECOMPOSITION_AUDIT_2026-05-19.md`. |

---

## 8. Test credentials

`/app/memory/test_credentials.md` обновлён (см. файл). Quick-login без пароля:
```
POST /api/auth/quick {"email":"<email>"}
```

Доступные emails: `admin@`, `john@`, `client@`, `multi@`, `tester@`, `alice.kim@`, `marco.rossi@`, `priya.shah@`, `luka.horvat@`, `sara.chen@`, `diego.silva@atlas.dev`.

---

## 9. Готово к следующей итерации

✅ Backend (741 endpoint) поднимается, сидит данные, фоновые daemon'ы крутятся
✅ Expo Metro собирает bundle (1563 модулей за ~64 с), web preview корректно рендерит EVA-X лендинг
✅ MongoDB подключён, money substrate сидирован
✅ Auth quick-login проверен (200 для admin@)
✅ Integration boundary-layer готов к live-flip
✅ `test_credentials.md` актуален
✅ `sentence-transformers` установлен → scope template embeddings работают

---

## 10. Что нужно для продолжения

1. **Подтверждение области работ** на следующую итерацию:
   - Web-сборка и Web-админка online?
   - Live-flip интеграций (какие ключи готовы?)
   - Стабилизация frozen-scope (D1 amendment #2)?
   - Контракт-документ для Payouts V2?
   - Конкретный roadmap-айтем из `audit/PHASE_*` или продуктовая фича?

2. **Опционально — ключи**:
   - `EMERGENT_LLM_KEY` (Universal Key) для Claude/GPT/Gemini/whisper/TTS/image-gen
   - `STRIPE_SECRET_KEY` (или использовать pod test-key)
   - `RESEND_API_KEY` (email)
   - `CLOUDINARY_*` (медиа)
   - `GOOGLE_CLIENT_ID/SECRET` (или Emergent Google Auth)

---

**Развёртывание выполнено. Аудит зафиксирован.**
Жду вашего сигнала для продолжения.
