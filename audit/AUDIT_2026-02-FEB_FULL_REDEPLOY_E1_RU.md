# АУДИТ + ПОЛНЫЙ РЕДЕПЛОЙ — ATLAS DevOS / EVA-X (Feb 2026)

**Дата:** 2026-02-FEB (текущая сессия E1)
**Источник:** `https://github.com/svetlanaslinko057/11232131231231` (branch `main`, последний commit `746f1a5` — auto-generated)
**Целевая среда:** `/app` (Emergent preview, `mobile-app-expo-16`)
**Автор:** E1 agent

---

## 1. Резюме (TL;DR)

Репозиторий **развёрнут с нуля** в чистый контейнер `/app`. Это не "новая разработка" — это **зрелая мульти-роль платформа** ATLAS DevOS / EVA-X:

- **Backend FastAPI** — 113 Python-файлов, ~27 883 строки в `server.py`, 459 routes только в основном api_router (общий счёт ~700+ с register_*_routes)
- **Frontend Expo (mobile)** — 36 экранов в `app/` + 9 ролевых поддиректорий (`admin/`, `client/`, `developer/`, `tester/`, `operator/`, `lead/`, `portfolio/`, `project/`, `contract/`, `workspace/`, `help/`)
- **Web CRA admin** — готовый build (`web/build/`, 11 MB), подмонтирован к `/api/web-ui/`
- **MongoDB** — 43 коллекции, 12 пользователей, 3 проекта, 99 модулей, 6 инвойсов
- **EMERGENT_LLM_KEY** добавлен в `backend/.env` — AI готов к flip-to-live
- Все остальные интеграции в **MOCK-режиме** (manifest честно сообщает)

Welcome screen Expo рендерится в превью с правильным брендингом **"EVA-X · Build real products. Not tasks."**

---

## 2. Состояние сервисов (после редеплоя)

| Сервис | Статус | Порт | Заметки |
|---|---|---|---|
| backend (FastAPI / uvicorn --reload) | ✅ RUNNING | 8001 | 459+ routes, lifespan ok, ВСЕ background loop'ы стартовали |
| expo (Metro --tunnel) | ✅ RUNNING | 3000 | Bundle ✅ 1465 modules (server) / 1559 modules (web) |
| mongodb | ✅ RUNNING | 27017 | 43 collections seeded |
| nginx-code-proxy | ✅ RUNNING | — | preview-проксирование |
| Web admin CRA | ✅ SERVED | `/api/web-ui/` | 200 OK |

### Smoke-тесты (живой прогон через preview URL `https://mobile-app-expo-16.preview.emergentagent.com`)

| Endpoint | Метод | Результат |
|---|---|---|
| `/api/healthz` | GET | 200 `{"status":"ok"}` |
| `/api/auth/login admin@atlas.dev` | POST | 200 + session cookie, role=admin |
| `/api/auth/login john@atlas.dev` | POST | 200, role=developer |
| `/api/auth/login client@atlas.dev` | POST | 200, role=client |
| `/api/auth/login tester@atlas.dev` | POST | 200, role=tester |
| `/api/auth/me` (client) | GET | 200 (полный профиль) |
| `/api/web-ui/` | GET | 200 (HTML CRA-бандла) |
| `/api/integrations/manifest` | GET | 200 — все capabilities в mock-mode |
| `/api/contracts/my` (client) | GET | 200 `{items:[],count:0}` |
| `/api/client/invoices` (client) | GET | 200 — 6 инвойсов (3 paid + …), Internal Ops Tool Sprint 1/2/Final |
| Welcome screen Expo (web preview) | render | ✅ EVA-X логотип, hero "Build real products. Not tasks.", 3 секвенции (SEQ-01/02/03) |

### Background loops (живые в backend.err.log)

```
GUARDIAN: loop started (interval 120s)
MODULE MOTION: loop started (interval 15s)
OPERATOR SCHEDULER: started (300s interval)
EVENT ENGINE: Background scanner started (15 min interval)
PAY-V2 worker started: id=worker_73cf4fa3ca interval=5s batch=10 lease=60s
PAY-V2 reaper started: interval=30s
PAY-V2 mock advancer started: interval=5s delay=2s
PAY-V2 scheduler started (interval 900s)
RECONCILE LOOP: started (interval 1800s)
CONTRACT REMINDER LOOP: started (interval 21600s)
MONEY BRIDGE: MoneyService initialised (Phase 2B PR-1)
MONEY LEDGER: indexes ensured
PAYOUTS_V2: indexes ensured
SEED REPLAY: noop (marker exists, batch_id=replay_00e90309c3)
L1 backfill: 89 modules default=auto
```

### Integrations manifest

```json
{
  "payment":    "mock",   // hard policy — STRIPE_SECRET_KEY missing
  "mail":       "mock",   // soft     — RESEND_API_KEY missing
  "storage":    "mock",   // soft     — CLOUDINARY_* missing
  "oauth":      "unavailable",
  "ai":         "mock",   // EMERGENT_LLM_KEY теперь есть → можно flip-to-live
  "settlement": "mock"    // STRIPE_CONNECT/PAYPAL DORMANT
}
```

---

## 3. Архитектура backend

### 3.1. Ядро (`server.py` — 27.8K LOC, 113 backend файлов)
Монолит-ядро + register_*_routes(api_router, db, get_current_user) паттерн. Все маршруты под `/api/*` (соответствует Kubernetes ingress).

### 3.2. Срез модулей backend по тематике

| Группа | Ключевые файлы | Назначение |
|---|---|---|
| **Auth** | `account_layer.py`, `auth_otp.py`, `google_auth.py`, `admin_users_layer.py` | session-token cookie, OTP, 2FA, Google (DORMANT) |
| **Контракты / Legal** | `legal_contract_layer.py`, `legal_data_layer.py`, `legal_admin_layer.py` | P3..P8 sealed, Fernet AES-128-CBC, GDPR-export/erasure |
| **Деньги (canonical)** | `money_ledger.py`, `money_bridge.py`, `money_projections.py`, `money_substrate_*.py` | Phase 2C-B sealed, AST guards |
| **Payouts V2** | `payouts_v2.py`, `payouts_v2_api.py`, `payouts_v2_worker.py`, `payouts_v2_reconciler.py`, `payment_providers/*` | P0..P5 sealed |
| **Биллинг legacy** | `earnings_layer.py`, `client_costs.py`, `payment_orchestrator.py`, `payouts_layer.py` | до Payouts V2 |
| **Provider adapters** | `integrations/settlement_stripe.py`, `settlement_paypal.py`, `cloudinary_service.py`, `email_service.py` | DORMANT (`mock` mode) |
| **AI / Cognition** | `cognition_engine.py`, `competitor_analyzer.py`, `module_intel.py`, `ai_*.py`, embedder `sentence-transformers/all-MiniLM-L6-v2` | EMERGENT_LLM_KEY готов |
| **Workflow / Ops** | `auto_guardian.py` (120s), `module_motion.py` (15s), `operator_engine.py` (300s), `event_engine.py` (900s) | 4 фоновых loop'а |
| **QA / Tester** | `tester_layer.py`, `validation_layer.py`, `validation_campaigns.py` | endpoints под `/api/tester/*` + `/api/validation/*` |
| **Admin** | `admin_*.py` (15+ файлов) | RBAC, oversight surfaces |
| **Observability** | `observability.py` | Sentry hooks no-op, client-error sink |
| **Compat / Runtime** | `compat_routes.py`, `runtime/*.ts` | старые маршруты + heatmap |
| **Middleware** | `middleware/*.py` | request_id, error envelope, idempotency |
| **Dev wallet** | `dev_wallet_reader.py`, `dev_work.py`, `developer_economy.py`, `developer_intelligence.py`, `developer_support.py` | Phase 2C-B читалка/писалка/проектор |

### 3.3. Pre-seeded MongoDB (43 коллекции)

| Коллекция | Documents |
|---|---|
| users | 12 (4 канонических: admin/john/client/tester + multi + boot accounts) |
| projects | 3 |
| modules | 99 |
| invoices | 6 (paid + pending mix для client@atlas.dev) |
| остальные | 39 коллекций (контракты, leдger, проекции, audit, sessions, и т.д.) |

---

## 4. Frontend (Expo mobile)

### 4.1. Структура `app/` (expo-router file-based routing)

```
app/
├── _layout.tsx              ← root layout, prewarm иконки, runtime middleware
├── +html.tsx                ← custom HTML shell for web SSR
├── index.tsx                ← welcome (EVA-X hero)
├── auth.tsx + two-factor-{setup,challenge,recovery}.tsx
├── describe.tsx / estimate-result.tsx / estimate-improve.tsx / project-booting.tsx (estimate→booting flow)
├── gateway.tsx, hub.tsx, work.tsx, settings.tsx, profile.tsx, account.tsx
├── chat.tsx, inbox.tsx, voice-demo.tsx, documents.tsx
├── activity.tsx, operator.tsx, help.tsx
├── admin/         ← admin cockpit (5 tabs + 8 drill-down)
├── client/        ← client workspace
├── developer/     ← developer brain / payouts / opportunities
├── tester/        ← QA campaigns
├── operator/      ← operator opportunities
├── lead/          ← sales lead surfaces
├── portfolio/     ← portfolio screens
├── project/       ← project-scoped detail
├── contract/      ← legal contract flows
├── workspace/     ← shared workspace primitives
└── help/          ← help center
```

**Total:** 36 файлов и подкаталогов в `app/` (expo-router routes).

### 4.2. Runtime middleware
`frontend/src/api.ts` — единый shim, через который проходят все 43 `import api` в Expo. Подключает token-prime, telemetry, retry middleware (см. `frontend/src/runtime/*`).

### 4.3. Welcome screen (визуальная проверка)
Через web preview снят скриншот:
- Логотип `EVA-X` (зелёный акцент)
- Hero `Build real products. Not tasks.`
- Subline `Describe your idea. Get a full product plan. Launch with our team.`
- Бэйдж `NO FREELANCERS · NO CHAOS · ONE SYSTEM`
- 3 sequences `SEQ-01 Describe your idea / SEQ-02 Get full plan & price / SEQ-03 We build your product`
- USP bullets: Real product, Fixed scope, Built by platform team, No hiring
- CTAs: "See my product plan →" + "Portfolio →" + "Log in"

Известные warning'и (pre-existing, не баги, заявлено пользователем):
- `Invalid borderColor` (var(--t-primary)44/33 в react-native-web)
- `props.pointerEvents is deprecated`
- `shadow* style props are deprecated`
- `WS auth-token 401` на первой загрузке (до login)
- `expo-notifications` web warning (это норма — пуши не работают на web)

---

## 5. Web admin CRA (`/web` → `/api/web-ui/`)

| Файл | Размер | Назначение |
|---|---|---|
| `web/build/` | 11 MB | готовый CRA-бандл, серверится бэкендом |
| `web/src/` | 2.9 MB | исходники CRA |
| `web/package.json` | — | tailwind 3 + craco config |
| `web/ARCHITECTURE.md` | — | doc |

Бэкенд (`server.py:27174`) монтирует статический CRA через `_WEB_BUILD_DIR=/app/web/build`. URL `/api/web-ui/` → 200 (HTML).

---

## 6. Что было сделано в этой сессии

1. **Очищен `/app` от boilerplate** и развёрнут полный репо в `/app`.
2. **Установлены backend deps** (`requirements.txt`, 170 пакетов): socketio, slowapi, stripe, reportlab, sentence-transformers, transformers, pyotp, и др.
3. **Удалены неиспользуемые CUDA-пакеты** (`nvidia-*`, `triton`, `cuda-*` = ~4.5 GB) из `/root/.venv` для освобождения диска (`/app` на 9.8 GB volume, после очистки 3.4 GB free).
4. **Установлены frontend deps** (`yarn install`, 641 пакет) с `--ignore-scripts` (napi-postinstall не критичен).
5. **`backend/.env` обновлён**: добавлены `EMERGENT_LLM_KEY` (из платформы) и `CORS_ORIGINS="*"`.
6. **Сервисы стартанули**:
   - backend (uvicorn): все 459+ routes, все background loop'ы (Guardian, Module Motion, Operator, Event Engine, Pay-V2 worker/reaper/scheduler/reconciler, Contract Reminder, Money Bridge)
   - expo (Metro --tunnel): bundle 1465 server / 1559 web modules
   - mongodb: 43 collections seeded
7. **Smoke-тесты пройдены**: healthz, login (×4 ролей), me, manifest, contracts/my, client/invoices (6 инвойсов), web-ui (200).
8. **Welcome screen Expo проверен** через preview URL — рендерится корректно с EVA-X брендингом.

---

## 7. Известные ограничения / интеграции в DORMANT

| Интеграция | Статус | Что нужно для flip-to-live |
|---|---|---|
| **Emergent LLM (AI)** | ✅ READY | Уже есть `EMERGENT_LLM_KEY=sk-emergent-***REDACTED***` в `backend/.env` |
| Stripe Connect | DORMANT | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (test key уже в pod, нужно прописать) |
| PayPal Payouts | DORMANT | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` |
| Resend (email) | DORMANT | `RESEND_API_KEY` |
| Cloudinary (file storage) | DORMANT | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Google OAuth | DORMANT | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Sentry | no-op | `SENTRY_DSN` |

Все они корректно сообщают свой `mock` режим через `/api/integrations/manifest` — UI это уважает.

---

## 8. Следующие шаги (готовы к запуску по вашему слову)

- [ ] Прогнать `testing_agent` по 4 high-priority frontend flow из `test_result.md`:
  - Documents screen (contracts + invoices)
  - Estimate → project booting flow (describe → estimate-result → project-booting)
  - Admin cockpit + 8 drill-down screens
  - Runtime-client migration (token-prime, retry, telemetry)
- [ ] Включить AI в боевой режим (`EMERGENT_LLM_KEY` уже залит, нужно только переключить флаг где-то в `cognition_engine.py` если он смотрит на manifest mode)
- [ ] Подключить остальные интеграции по мере поступления ключей
- [ ] Любые продуктовые улучшения / новые экраны по запросу

---

## 9. Контакты в системе (test_credentials)

| Роль | Email | Пароль |
|---|---|---|
| admin | admin@atlas.dev | admin123 |
| developer | john@atlas.dev | dev123 |
| client | client@atlas.dev | client123 |
| tester | tester@atlas.dev | tester123 |
| multi | multi@atlas.dev | multi123 |

Подробнее см. `/app/memory/test_credentials.md`.

---

**Статус:** ✅ Развёрнуто, проверено, готово к работе. Ждём вашего следующего шага.
