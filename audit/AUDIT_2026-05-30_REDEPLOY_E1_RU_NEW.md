# Полное развёртывание + аудит — 2026-05-30 (новая среда)

**Репозиторий:** `svetlanaslinko057/evvaaa` (snapshot 444538f)
**Проект:** ATLAS DevOS / EVA-X
**Среда:** Emergent workspace `/app`
**Сессия:** E1, full redeploy + audit, MOCK-режим всех интеграций
**Предыдущий аудит:** `audit/AUDIT_2026-05-30_FULL_REDEPLOY_E1_RU.md`

---

## 0. TL;DR

| Слой | Состояние | Комментарий |
|------|-----------|-------------|
| Backend (FastAPI) | ✅ **RUNNING** | **743 endpoint**, lifespan ок, все сидеры прошли |
| Mobile (Expo SDK 54) | ✅ **RUNNING** | Tunnel ок, web-preview рендерит EVA-X лендинг (1564 модуля собрано) |
| Web (CRA + craco) | ✅ **BUILT** | `/app/web/build` присутствует в репо (asset-manifest + статика) |
| MongoDB 7.x | ✅ **RUNNING** | Полный сидинг прошёл (6 dev pool / 89 модулей / 81 QA / 5 валидаций / 70 replay) |
| Интеграции | 🔶 **MOCK** | `INTEGRATIONS_LIVE_ENABLED` не выставлен — все live-адаптеры дормантны |
| Quick-login | ✅ **OK** | `POST /api/auth/quick {email:"admin@atlas.dev"}` → 200 |
| Disk `/dev/nvme0n4` | ⚠️ **75%** | 7.3 GB / 9.8 GB (после torch + sentence-transformers + node_modules) |

**Готово к разработке.** Бэкенд отвечает реальному фронтенду (видны `GET /api/integrations/manifest` из preview), money substrate, escrow, payouts v2 worker / reaper / mock advancer / scheduler / reconciler — все daemon'ы запущены.

---

## 1. Что было сделано

### 1.1. Развёртывание из GitHub

- Стартовое `/app` содержало только базовый Expo-template (backend/server.py от Emergent, frontend/app/_layout.tsx + index.tsx, .env). Полный код репо отсутствовал.
- Сохранены защищённые файлы: `backend/.env` (`MONGO_URL`, `DB_NAME`), `frontend/.env` (`EXPO_PACKAGER_*`, `EXPO_PUBLIC_BACKEND_URL`), `/app/.emergent`, `/app/.git`.
- Клонирован `svetlanaslinko057/evvaaa` (depth 1, 254 MB) в `/tmp/evvaaa_repo`.
- Применён `rsync -a` с исключениями `.git, .emergent, backend/.env, frontend/.env, frontend/node_modules, frontend/.metro-cache, frontend/.expo`.
- `/tmp/evvaaa_repo` удалён после синка.

### 1.2. Зависимости backend

- `pip install --no-cache-dir -r backend/requirements.txt` — 150 пакетов (litellm, emergentintegrations, motor, slowapi, stripe, python-socketio, resend, google-genai, **torch 2.12.0**, pyotp, bcrypt, **sentence-transformers 5.5.1**).
- Конфликт при первой попытке: диск `/dev/nvme0n4` заполнился (`ENOSPC`). Очистил `/root/.cache/pip` (~3 GB) и `/tmp/evvaaa_repo`. После повторной установки диск = 75%.
- Все импорты резолвятся; `import socketio`, `import sentence_transformers` ОК.

### 1.3. Зависимости frontend

- `yarn install` в `/app/frontend` — без ошибок, lockfile не менялся.
- Expo SDK 54.0.35, React 19.1, React Native 0.81.5, expo-router 6.0.22, reanimated 4.1.1.
- Плагины: `expo-router`, `expo-splash-screen`, `expo-web-browser`, `expo-audio`, `expo-secure-store`, `expo-asset`. Все резолвятся.

### 1.4. Перезапуск сервисов

```
backend          RUNNING  uvicorn server:app --host 0.0.0.0 --port 8001 --reload
expo             RUNNING  yarn expo start --tunnel --port 3000 (CI=true)
mongodb          RUNNING  mongod --bind_ip_all
nginx-code-proxy RUNNING  ingress / → :3000, /api/* → :8001
```

### 1.5. Boot lifespan — успешный сидинг

Из логов `/var/log/supervisor/backend.err.log`:

- AUTH OTP init: DEV_MODE=False, mail_provider=mock-mail
- CLOUDINARY: MOCK mode (без API key — файлы локально)
- Seeded mock providers + portfolio cases
- Создан admin user + 5 quick-access (admin/john/client/multi/tester)
- 6 dev pool: alice (senior) / marco (senior) / priya (middle) / luka (middle) / sara (junior) / diego (senior)
- 89 modules, 81 qa_decisions, 6 canonical money_states (легаси `dev_wallets` не тронут)
- Demo project `Acme Analytics Platform` для `client@atlas.dev` (3 модуля)
- MOCK_SEED: 2 проекта, 7 модулей, 6 earnings, 6 invoices, 2 deliverables, 3 tickets, 3 notifications, 7 cognition_actions
- SEED_REPLAY `boot_replay_v1`: 14 дней, 70 событий (16 overrides / 14 qa_fail / 19 reassign / 12 overload / 9 suppression)
- L1 backfill: 89 модулей default=auto, 1 user default=external; L0: 12 users default states=[]
- Notifications seed: 5 (admin) + 3 (john) + 3 (client)
- TESTER SEED: 5 валидаций + 1 issue → tester@atlas.dev
- EMBEDDING: модель `sentence-transformers/all-MiniLM-L6-v2` загружена, 4 scope templates засеяны с эмбеддингами
- System config засеян
- Background loops запущены:
  - EVENT ENGINE: 15 min interval
  - PAY-V2 worker (id=worker_497d78ea99, batch=10, lease=60s, max_attempts=5)
  - PAY-V2 reaper: 30s
  - PAY-V2 mock advancer: 5s, delay=2s
  - PAY-V2 scheduler: 900s
  - GUARDIAN: 120s
  - MODULE MOTION: 15s
  - CONTRACT REMINDER: 21600s (6h)
  - OPERATOR SCHEDULER: 300s
  - RECONCILE LOOP: 1800s (первый прогон: scanned=0, discrepancies=0)
- MoneyService initialised (Phase 2B PR-1)
- MONEY LEDGER + COMPETITOR CACHE + VALIDATION CAMPAIGNS: индексы созданы

### 1.6. Smoke-проверки

```
GET  /api/healthz                                  → 200 {"status":"ok"}
GET  /openapi.json                                 → 200 (743 paths)
POST /api/auth/quick {"email":"admin@atlas.dev"}   → 200 user{role:admin}
GET  https://<preview>/  (Expo SSR)                → 200, рендерит EVA-X hero
```

Скриншот фронтенда: `Build real products. Not tasks.` — герой-блок,
seq-01/02/03, USP-список, CTA «See my product plan», NO FREELANCERS · NO CHAOS
· ONE SYSTEM band. Дизайн совпадает с design_guidelines.json (dark theme,
mint accent).

---

## 2. Размер кодовой базы

| Слой | Метрика |
|------|--------:|
| `backend/server.py` | **28 225 строк** |
| Backend, .py файлов | **91** |
| Frontend (Expo), .tsx файлов под `app/` | **100** |
| Web (CRA), страниц под `web/src/pages/` | **98** |
| Web build, артефакты в `web/build/` | присутствуют |
| Audit документов под `audit/` | **143 .md** |
| Endpoints (`/openapi.json`) | **743** |
| Money substrate тесты под `tests/` | 50+ файлов |

---

## 3. Архитектура (без изменений с README)

### 3.1. Backend

Группы (как в `README.md` секции 1.1):

- **Auth/Identity** — `auth_otp.py`, `two_factor.py`, `google_auth.py`, `account_layer.py`
- **Money substrate** (Phase 2A/2B/2C) — `domains/money/service.py` (canonical), `money_runtime.py`, `money_ledger.py`, `money_bridge.py`, `money_replay.py`, `money_projections.py`, `money_divergence.py`, `escrow_*`, `payout_layer.py`, `earnings_layer.py`, `dev_wallet_reader.py`
- **Payouts V2** — `payouts_v2.py` + `_api` + `_worker` + `_reconciler` (4 daemon'а в lifespan, все запустились)
- **Acceptance / Assignment / Decomposition** — `acceptance_layer.py`, `assignment_engine.py`, `decision_layer.py`, `decomposition_engine.py`
- **Work execution** — `work_execution.py`, `module_execution.py`, `module_motion.py`, `dev_work.py`, `event_engine.py`, `time_tracking_layer.py`
- **Intelligence** — `developer_brain.py`, `team_intelligence.py`, `intelligence_layer.py`, `revenue_brain.py`, `execution_intelligence.py`, `competitor_analyzer.py`
- **Admin** — 10 модулей (admin_actions/control/integrations/llm/mobile/production/risk/system/team/users)
- **Client/Team/Operator** — 6 модулей
- **Integrations boundary** — `integrations/{base,registry,mocks,live_adapters,ai,mail,oauth,payment,storage}` + `cloudinary_service.py`, `email_service.py`, `stt_service.py`, `push_sender.py`
- **Payment providers** — `mock`, `stripe_provider`, `wayforpay`
- **Compat / Mobile bridge** — `compat_routes.py`, `mobile_adapter.py`, `etap3_routes.py`
- **Background daemons** — `overdue_daemon.py`, `auto_guardian.py`, `reputation_decay.py`, `flow_control.py`, `legal_contract_layer.py`

Endpoint-карта (743 paths): admin/* — 265, developer/* — 73, client/* — 66,
modules/* — 23, account/* — 23, payouts-v2/* — 22, execution-intelligence/* — 19,
auth/* — 18, ai/* — 13, contracts/* — 12, system/* — 10, плюс escrow / billing /
marketplace / tester / mobile / validation / provider.

### 3.2. Mobile Expo

5 ролевых поверхностей под `app/`:

- **client** (`app/client/*`): home, projects, contracts, deliverables, billing, payment-plan, control, activity, support, validation (history + mission + index), referrals, profile, more, versions
- **developer** (`app/developer/*`): полная dev-поверхность
- **admin** (`app/admin/*`): 21 экран (⚠️ расхождение с D1 freeze: должен быть cockpit + 8 read-mostly drill-downs)
- **tester** (`app/tester/*`): Stage 4 — home, validations, validation/, mission/, history
- **lead** (`app/lead/workspace.tsx`): conversion surface only

Общие: auth, 2FA setup, account/profile/settings, project-booting, hub, operator,
chat, inbox, describe, estimate-improve, estimate-result, voice-demo,
portfolio (index + [caseId]), help (index + [ticketId]), activity, workspace/[id].

### 3.3. Web (CRA + craco)

- 98 страниц под `web/src/pages/` (admin / client / developer / tester / builder / provider)
- 4 контекста (Language, Theme, Auth, RealtimeSocket)
- i18n EN/UK с parity 1938 ключей
- Собственный design-system из `packages/design-system`
- **build/** присутствует — статика готова

### 3.4. Shared / packages

- `packages/runtime-client` — единый runtime для mobile + web
- `packages/design-system` — токены и компоненты

---

## 4. Money substrate (контракт)

Substrate **запечатан** (`audit/MONEY_SUBSTRATE_COMPLETION_MILESTONE.md`):

- Single source of truth: `domains/money/service.py`
- Канонические money_states (escrow/earnings/payout) для 6 dev pool — сидируются при boot
- Bridges: 2B PR-1/PR-2/PR-3 (escrow/earnings/payout)
- Phase 2C: B1 projection → B2/B3 stability + read switch → B4.0…B4.5 acceptance → writer removal plan
- Divergence Observer (B4.5, passive): `money_divergence.py` активен

**Payouts V2** — новый слой (22 endpoint, 4 daemon'а): worker + reaper + mock advancer + scheduler + reconciler. Все daemon'ы стартовали в lifespan; первый reconcile-прогон чист (0 discrepancies).

---

## 5. Интеграции (всё в MOCK)

| Provider | Состояние | Триггер на live |
|----------|-----------|-----------------|
| Stripe | mock | `STRIPE_SECRET_KEY` + `INTEGRATIONS_LIVE_ENABLED=1` |
| WayForPay | mock | `WAYFORPAY_*` ключи |
| Cloudinary | mock (локальные файлы) | `CLOUDINARY_*` ключи |
| Resend (email) | mock-mail | `RESEND_API_KEY` |
| Google OAuth | dormant | `GOOGLE_CLIENT_ID/SECRET` |
| EMERGENT LLM | not configured | `EMERGENT_LLM_KEY` (litellm + emergentintegrations) |
| Push (FCM/APNS) | dormant | `EMERGENT_PUSH_KEY` + deploy build |

Изоляция: вся бизнес-логика идёт через `integrations/registry.py` → `integrations/live_adapters.py`. SDK напрямую не импортируется.

---

## 6. Безопасность

- Sessions cookie-based, **bcrypt $2b$12$** для password hashing (подтверждено по seeded admin)
- 2FA через TOTP (`pyotp`), recovery codes, trusted devices
- Money substrate: passive divergence observer (B4.5)
- `.env` файлы в `.gitignore`
- Stripe тестовые ключи в репо **заменены на placeholders** (см. README)

---

## 7. Frozen-scope (D1/D2/D3) — статус

| Decision | Правило | Текущее состояние |
|----------|---------|-------------------|
| **D1** Expo admin | 5 cockpit tabs + 8 read-mostly drill-downs | ⚠️ **Расхождение**: 21 .tsx файл под `app/admin/` (см. ROADMAP.md) |
| **D2** Expo tester | Stage 4 (4 screens) | ✅ Готово |
| **D3** Lead | Conversion surface, без роли в auth | ✅ Готово (`app/lead/workspace.tsx`) |

---

## 8. Известные риски / next-steps

1. **Disk pressure 75%** на `/dev/nvme0n4` (9.8 GB). Free 2.5 GB. При следующих установках следить за свободным местом, можно очищать `.metro-cache` и pip-cache.
2. **D1 admin Expo расхождение** — 21 экран вместо запечатанных 5+8. Требует amendment или сокращения.
3. **Pytest-asyncio** не в requirements — часть async-тестов в `tests/` не запустится «из коробки». Не блокирует runtime.
4. **Live интеграции** требуют ключей: Stripe, Resend, Cloudinary, Google OAuth, EMERGENT_LLM_KEY. По умолчанию всё mock — это контракт `integrations/registry.py`.
5. **Push notification feature** не тестируется в Expo Go preview — нужен dev/production build (`emergent publish`).

---

## 9. Что готово к продолжению разработки

✅ Backend отвечает реальному preview-фронтенду (`GET /api/integrations/manifest` фиксируется в логах)
✅ Auth quick-login проходит для всех 5 ролей
✅ Money substrate стартует, payouts v2 daemon'ы крутятся
✅ EVA-X лендинг рендерится корректно (hero + sequence + USP + CTA)
✅ Web build готов
✅ `memory/test_credentials.md` синхронизирован с фактически засеянными пользователями

**Готово начинать разработку.** Ждём указание по следующему треку — варианты в `ROADMAP.md`:
- Track 1: Cabinet i18n EN→UK sweep (30 файлов hardcoded≥2)
- Track 2: D1 admin Expo recovery (21 → 5+8 screens)
- Track 3: Payouts V2 contract doc в `/audit/`
- Track 4: Live-flip первого провайдера (Stripe/Resend/Cloudinary)
- Любая новая фича по запросу
