# ATLAS DevOS — EVA-X

> **Execution substrate** для запуска софтверных продуктов: клиент описывает идею →
> система генерирует scope + ценник → команда выполняет под escrow-контрактом →
> QA пропускает поставку → выплаты автоматически.
> Не SaaS, не маркетплейс фрилансеров — **операционная подложка**, где люди
> выполняют работу внутри детерминированного flow.

| Слой | Стек | Состояние |
|------|------|-----------|
| Backend | FastAPI 0.x · MongoDB · litellm · emergentintegrations · Stripe · WayForPay · Cloudinary · Resend | **741 endpoint**, lifespan ok |
| Mobile (Expo) | Expo SDK 54 · expo-router · React Native 0.81 · TypeScript · Reanimated | 5 ролей (admin/client/developer/tester/lead) |
| Web | React 18 · CRA + craco · Tailwind · Radix · собственный design-system | 98 страниц кабинета · i18n EN+UK |
| Shared | `packages/runtime-client` · `packages/design-system` | Единый клиент-рантайм |

## 0. TL;DR — запуск за 60 секунд

```bash
git clone https://github.com/svetlanaslinko057/APPPP.git
cd APPPP
bash scripts/bootstrap.sh           # установит зависимости + поднимет сервисы
curl http://localhost:8001/api/healthz   # {"status":"ok"}
```

Полная инструкция — секция 3 ниже. Bootstrap идемпотентен: безопасно прогонять
повторно.

---

## 1. Архитектурный карт

### 1.1. Backend — `/backend` (91 .py файл, `server.py` = 28 221 строк)

| Группа | Модули |
|--------|--------|
| **Auth / Identity** | `auth_otp.py`, `two_factor.py`, `google_auth.py`, `account_layer.py` |
| **Money substrate** (Phase 2A/2B/2C) | `money_runtime.py`, `money_ledger.py`, `money_bridge.py`, `money_replay.py`, `money_projections.py`, `money_divergence.py`, `escrow_layer.py`, `escrow_api.py`, `client_escrow.py`, `payout_layer.py`, `earnings_layer.py`, `dev_wallet_reader.py`, `domains/money/*` |
| **Payouts V2** | `payouts_v2.py`, `payouts_v2_api.py`, `payouts_v2_worker.py`, `payouts_v2_reconciler.py` |
| **Acceptance / Assignment** | `acceptance_layer.py`, `assignment_engine.py`, `decision_layer.py`, `decomposition_engine.py`, `client_acceptance.py` |
| **Work execution** | `work_execution.py`, `module_execution.py`, `module_motion.py`, `dev_work.py`, `event_engine.py`, `time_tracking_layer.py` |
| **Intelligence / Brains** | `developer_brain.py`, `team_intelligence.py`, `intelligence_layer.py`, `revenue_brain.py`, `execution_intelligence.py`, `competitor_analyzer.py` |
| **Admin** | `admin_actions.py`, `admin_control.py`, `admin_integrations.py`, `admin_llm_settings.py`, `admin_mobile.py`, `admin_production.py`, `admin_risk.py`, `admin_system.py`, `admin_team.py`, `admin_users_layer.py` |
| **Client / Team / Operator** | `client_*`, `team_*`, `operator_engine.py` |
| **Integrations (boundary)** | `integrations/{base,registry,mocks,live_adapters,ai,mail,oauth,payment,storage}`, `cloudinary_service.py`, `email_service.py`, `stt_service.py`, `push_sender.py` |
| **Payment providers** | `payment_providers/{base,mock,stripe_provider,wayforpay}` |
| **Compat / Mobile bridge** | `compat_routes.py`, `mobile_adapter.py`, `etap3_routes.py` |
| **Background daemons** | `overdue_daemon.py`, `auto_guardian.py`, `reputation_decay.py`, `flow_control.py`, `legal_contract_layer.py`, `payouts_v2_worker.py` |
| **Shared / Infra** | `shared/`, `middleware/`, `infrastructure/db/repositories/*`, `api/adapters/web_adapter.py`, `domains/`, `services/` |

**Endpoint-карта (741 paths):**
```
/api/admin/*                  265  /api/payouts-v2/*  22  /api/mobile/*  10
/api/developer/*               73  /api/execution-intelligence  19  /api/projects/*  8
/api/client/*                  66  /api/auth/*        18  /api/validation/*  8
/api/modules/*                 23  /api/ai/*          13  /api/provider/*    8
/api/account/*                 23  /api/contracts/*   12  + escrow / billing /
                                   /api/system/*      10    marketplace / tester
```

### 1.2. Mobile Expo — `/frontend` (95 .tsx файлов)

5 ролевых поверхностей под `app/`:
- **client** — workspace, billing, контракт, deliverable, control, activity
- **developer** — полная dev-поверхность (assignments, work, growth, earnings)
- **admin** — operational cockpit (5 frozen tabs) + 8 read-mostly drill-down'ов
  (по `docs/product-scope-freeze-amend-1.md`)
- **tester** — Stage 4 (home, validations, validation/, mission/, history)
- **lead** — conversion surface only (`workspace.tsx`, без отдельной роли в auth)

Плюс auth/gateway, 2FA, account/profile/settings, project-booting, hub,
operator, chat, inbox, describe, estimate-improve, estimate-result.

### 1.3. Web — `/web` (243 файла, React 18 + CRA + craco)

- 98 страниц кабинета под `src/pages/` (admin/client/developer/tester/builder/provider)
- 4 контекста (Language, Theme, Auth, RealtimeSocket)
- i18n EN/UK (1938 ключей parity, см. `src/i18n/dictionary.js`)
- Собственный design-system из `packages/design-system`
- ⚠️ `web/build/` **не собран** — нужно `cd web && yarn build`

### 1.4. Documentation

- `/audit` — **91 .md файл** (контракты, фазовые close-out'ы, smoke-trace'ы, governance)
- `/docs` — product scope freeze + amendment, runtime-contracts, synthetic corpus
- `test_result.md`, `design_guidelines.{json,md}` в корне

---

## 2. Money substrate (контракт)

Substrate **запечатан** (`audit/MONEY_SUBSTRATE_COMPLETION_MILESTONE.md`,
`SUBSTRATE_SEALING_REVIEW_SIGNOFF.md`):
- Single source of truth: `domains/money/service.py`
- Канонические money_states (escrow / earnings / payout) для 6 dev pool
  пользователей сидируются при boot
- Bridges: `PHASE_2B_PR1_ESCROW_BRIDGE`, `PR2_EARNINGS_BRIDGE`, `PR3_PAYOUT_BRIDGE`
- Phase 2C: B1 projection → B2/B3 stability + read switch → B4.0…B4.5 acceptance
  → writer removal plan
- Divergence Observer (B4.5, passive): `money_divergence.py`

Новый слой **Payouts V2** (22 endpoint, 4 daemon'а) ещё без контракт-документа
в `/audit/` — см. ROADMAP.md.

---

## 3. Запуск проекта

### 3.1. Требования

- **Docker**-окружение или Linux/macOS машина
- Python **3.11**, Node **20+**, Yarn **1.22**
- MongoDB **7.x** (локально или Atlas)
- Диск: **не менее 12 GB свободного места** (torch + node_modules + sentence-transformers)

### 3.2. Быстрый старт (Bootstrap)

```bash
bash scripts/bootstrap.sh
```

Скрипт делает (идемпотентно):
1. Проверяет наличие Python 3.11, Node 20+, MongoDB, Yarn.
2. Создаёт `backend/.env` и `frontend/.env` из примеров (если нет).
3. `pip install -r backend/requirements.txt` + `sentence-transformers`.
4. `yarn install --frozen-lockfile` в `/frontend` и `/web`.
5. Запускает MongoDB (если не запущен), backend, expo, web (опционально).
6. Сэмпл-сидинг при первом старте backend (admin@, client@, developer pool).
7. Smoke-проверка: `GET /api/healthz`, `GET /openapi.json` (741 paths).

Полный help: `bash scripts/bootstrap.sh --help`.

### 3.3. Ручная установка (если bootstrap не подошёл)

```bash
# 1. Backend
cd backend
pip install -r requirements.txt
pip install sentence-transformers==5.5.1   # отсутствует в requirements
cp .env.example .env                       # MONGO_URL, DB_NAME
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 2. Frontend (Expo)
cd ../frontend
yarn install
cp .env.example .env                       # EXPO_PUBLIC_BACKEND_URL
yarn expo start --tunnel --port 3000

# 3. Web (опционально, если нужна веб-админка)
cd ../web
yarn install
yarn build                                 # production build в web/build/

# 4. MongoDB
mongod --bind_ip_all
```

### 3.4. ENV-переменные

| Переменная | Где | По умолчанию | Назначение |
|-----------|-----|--------------|-----------|
| `MONGO_URL` | `backend/.env` | `mongodb://localhost:27017` | Подключение к Mongo |
| `DB_NAME` | `backend/.env` | `test_database` | Имя БД |
| `EMERGENT_LLM_KEY` | `backend/.env` | — | Universal LLM key (Claude/GPT/Gemini) |
| `INTEGRATIONS_LIVE_ENABLED` | `backend/.env` | `0` (mock) | `1` → активирует live-адаптеры |
| `RESEND_API_KEY` | `backend/.env` | — | Email (иначе mock-mail) |
| `STRIPE_SECRET_KEY` | `backend/.env` | — | Платежи (иначе mock provider) |
| `WAYFORPAY_*` | `backend/.env` | — | UA-платежи |
| `CLOUDINARY_*` | `backend/.env` | — | Медиа (иначе local files) |
| `GOOGLE_CLIENT_ID/SECRET` | `backend/.env` | — | OAuth |
| `EXPO_PUBLIC_BACKEND_URL` | `frontend/.env` | — | Бэкенд для Expo |
| `EXPO_PACKAGER_*` | `frontend/.env` | platform | **НЕ МЕНЯТЬ** на Emergent |

При отсутствии ключей: **всё работает в MOCK** — это контракт `integrations/registry.py`.

### 3.5. Quick-login (тестовые пользователи)

После первого boot backend сидирует 11 пользователей. Логин без пароля:

```bash
curl -X POST http://localhost:8001/api/auth/quick \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@atlas.dev"}'
```

Список см. `memory/test_credentials.md`.

### 3.6. Сервисы на Emergent (supervisor)

```
backend          uvicorn server:app --host 0.0.0.0 --port 8001 --reload   port 8001
expo             yarn expo start --tunnel --port 3000                     port 3000
mongodb          mongod --bind_ip_all                                     port 27017
nginx-code-proxy / → :3000   /api/* → :8001                               port 80
```

Команды: `sudo supervisorctl {start|stop|restart} {backend|expo|mongodb}`.

### 3.7. Деплой

- **Emergent platform** — кнопка «Publish» (top-right) → автогенерация iOS/Android
  билдов + web hosting. Это рекомендуемый путь.
- **Self-hosted** — Docker-compose / Kubernetes (контракты в `audit/`).
  Образ ещё не собран — см. ROADMAP.md.

---

## 4. Frozen-scope (что НЕ делается без amendment)

Из `docs/product-scope-freeze.md` (2026-05-09) + amendment 1 (2026-05-19):

| Decision | Правило |
|----------|---------|
| **D1** | Expo admin = **cockpit + read-mostly drill-downs**. 5 frozen tabs + 8 read-only screens. Полный admin = веб. Бизнес-логика на Expo **запрещена**. |
| **D2** | Expo tester = Stage 4 (4 screens). Готово. |
| **D3** | Lead = conversion surface only. Отдельной роли в auth **нет**. |

⚠️ **Текущее расхождение D1**: на Expo фактически 21 экран в `app/admin/`.
См. ROADMAP.md.

---

## 5. Безопасность

- Все интеграции изолированы за `integrations/registry.py` → `integrations/live_adapters.py`.
- Бизнес-логика **не импортирует SDK напрямую**. Live-flip = одна переменная +
  ключи.
- Сессии cookie-based, bcrypt (`$2b$12$...`) для password hashing.
- 2FA через TOTP (`pyotp`), recovery codes, trusted devices.
- Money substrate: passive divergence observer (B4.5), blast radius
  зафиксирован (`MONEY_BLAST_RADIUS.md`).

⚠️ `.env` файлы **в `.gitignore`**. Не коммитьте ключи. Используйте Emergent
secret store или ваш CI vault.

---

## 6. Полезные ссылки

- Полный аудит: `audit/AUDIT_2026-05-30_FULL_REDEPLOY_E1_RU.md`
- i18n coverage: `audit/CABINET_I18N_COVERAGE_2026-05-30.md`
- i18n sweep log: `audit/CABINET_I18N_SWEEP_2026-05-30.md`
- Дорожная карта: [`ROADMAP.md`](./ROADMAP.md)
- Test credentials: `memory/test_credentials.md`

---

## License

Internal / proprietary.
