# 🔍 АУДИТ + ПОЛНЫЙ РЕДЕПЛОЙ — ATLAS DevOS / EVA-X

**Дата:** 2026-05-26
**Источник:** `https://github.com/svetlanaslinko057/5757576YT7` (branch `main`, commit `c0e0ec2`)
**Целевая среда:** `/app` (Emergent preview, mobile-preview-build-1)
**Автор:** E1 agent

---

## 1. Резюме (TL;DR)

Проект **полностью развёрнут и работает**. Это не «новая разработка» — это уже зрелая система **ATLAS DevOS / EVA-X** с:

- **Backend FastAPI** — 732 маршрута, 193 Python-файла, 27 883 строки в `server.py` (монолит-ядро + 100+ модулей)
- **Frontend Expo (mobile)** — 100 `.tsx` экранов в 11 ролевых ветках (`admin/`, `client/`, `developer/`, `tester/`, `operator/`, `lead/`, `portfolio/`, `project/`, `contract/`, `workspace/`, `help/`)
- **Web CRA admin** — 183 JS/TS файла + готовый build (`web/build/`, 2.4MB) подмонтированный к `/api/web-ui/`
- **MongoDB** — 43 коллекции, 12 пользователей, 3 проекта, 99 модулей, 6 инвойсов, ⚠️ Phase 2C-B Money Substrate уже sealed
- **Платёжный движок Payouts V2** — P0+P1+P2A+P3+P4+P5 sealed (рабочий + наблюдатель + UI), Stripe Connect и PayPal в DORMANT-режиме
- **Контракты P3..P8** sealed: legal-profile, signature composer, AES-128-CBC шифрование, GDPR-export/erasure
- **Observability** — Sentry hooks (no-op без DSN), client-error sink, 4 фоновых loop'а (Guardian 120s, Module Motion 15s, Operator 300s, Event 15min)

Все интеграции в **MOCK-режиме** (manifest честно сообщает). `EMERGENT_LLM_KEY` добавлен в `.env` — AI готов к flip-to-live.

---

## 2. Состояние сервисов

| Сервис | Статус | Порт | Заметки |
|---|---|---|---|
| backend (FastAPI / uvicorn) | ✅ RUNNING | 8001 | 732 routes, lifespan ok, все loop'ы стартовали |
| expo (Metro tunnel) | ✅ RUNNING | 3000 | Bundle 1465 modules (server) / 1544 modules (web), tunnel ready |
| mongodb | ✅ RUNNING | 27017 | 43 collections seeded |
| nginx-code-proxy | ✅ RUNNING | — | preview-проксирование |
| Web admin CRA build | ✅ SERVED | `/api/web-ui/` | 530 KB gzip bundle |

### Smoke-тесты (живой прогон)

| Endpoint | Метод | Результат |
|---|---|---|
| `/api/healthz` | GET | 200 `{"status":"ok"}` |
| `/api/auth/login admin` | POST | 200 + session cookie, role=admin |
| `/api/auth/login john` | POST | 200, role=developer |
| `/api/auth/login client` | POST | 200, role=client |
| `/api/auth/login tester` | POST | 200, role=tester |
| `/api/web-ui/` | GET | 200 (HTML CRA) |
| `/api/integrations/manifest` | GET | 200, mock-mode честно |
| `/api/contracts/my` (client) | GET | 200 `{items:[], count:0}` |
| `/api/client/invoices` (client) | GET | 200, 6 инвойсов, paid+pending mix |
| `/api/auth/me` (client) | GET | 200 (полный профиль) |
| Welcome screen Expo | render | ✅ EVA-X брендинг, hero "Build real products. Not tasks." |

---

## 3. Архитектура backend (карта модулей)

### 3.1. Ядро (`server.py` — 27.8K LOC)
Содержит startup-логику, seed-данные (admin/client/developer/tester), регистрацию всех router'ов через `register_*_routes(api_router, db, get_current_user)` паттерн. Все маршруты под `/api/*` (соответствует Kubernetes ingress).

### 3.2. Слои (срез по тематике)

| Группа | Файлы | Назначение |
|---|---|---|
| **Auth** | `account_layer.py`, `auth_otp.py`, `google_auth.py`, `admin_users_layer.py` | session-token cookie, OTP, Google (DORMANT) |
| **Контракты / Legal** | `legal_contract_layer.py`, `legal_data_layer.py`, `legal_admin_layer.py` | P3..P8 sealed, Fernet AES-128, GDPR |
| **Деньги (canonical)** | `money_ledger.py`, `money_bridge.py`, `money_projections.py`, `money_substrate_*.py` | Phase 2C-B sealed, AST guards |
| **Payouts V2** | `payouts_v2.py`, `payouts_v2_api.py`, `payouts_v2_worker.py`, `payouts_v2_reconciler.py`, `payment_providers/` | P0..P5 sealed |
| **Биллинг (legacy)** | `earnings_layer.py`, `client_costs.py`, `payment_orchestrator.py`, `payouts_layer.py` | до Payouts V2 |
| **Provider adapters** | `integrations/settlement_stripe.py`, `settlement_paypal.py`, `cloudinary_service.py`, `email_service.py` | сейчас DORMANT, готовы к flip |
| **AI / Cognition** | `cognition_engine.py`, `competitor_analyzer.py`, `module_intel.py`, `ai_*.py`, embedder via `sentence-transformers/all-MiniLM-L6-v2` | EMERGENT_LLM_KEY готов |
| **Workflow / Ops** | `auto_guardian.py` (120s), `module_motion.py` (15s), `operator_engine.py` (300s), `event_engine.py` (900s) | 4 фоновых loop'а |
| **QA / Tester** | `tester_layer.py`, `validation_layer.py`, `validation_campaigns.py` | 13 endpoints под `/api/tester/*` + `/api/validation/*` |
| **Admin** | `admin_*.py` (15 файлов) | RBAC-защита, oversight surfaces |
| **Observability** | `observability.py` | Sentry no-op, client-error capture |
| **Compat / Runtime** | `compat_routes.py`, `runtime/*.ts` | старые маршруты + heatmap для миграции |
| **Middleware** | `middleware/*.py` | request_id, error envelope, idempotency |

### 3.3. Background loops (живые)
```
GUARDIAN: loop started (interval 120s)
MODULE MOTION: loop started (interval 15s)
OPERATOR SCHEDULER: started (interval 300s)
EVENT ENGINE: started (interval 900s)
PAY-V2 worker: id=worker_4922c3a781 interval=5s batch=10 lease=60s
PAY-V2 reaper: interval=30s
PAY-V2 mock advancer: interval=5s
PAY-V2 scheduler: interval 900s
CONTRACT REMINDER LOOP: interval 21600s
```

---

## 4. Frontend (Expo mobile)

### 4.1. Структура `app/` (expo-router file-based routing)

```
app/
├── _layout.tsx              ← root layout, prewarm иконки, runtime middleware
├── index.tsx                ← welcome ("Build real products. Not tasks.")
├── auth.tsx, two-factor-*.tsx
├── describe.tsx → estimate-* → project-booting.tsx  ← lead-conversion flow
├── admin/   (cockpit: home/users/team/contracts/templates/integrations/inbox/marketplace/master)
├── client/
├── developer/
├── tester/   (Stage 4: home, validation list/detail, history)
├── operator/
├── lead/workspace.tsx       ← pre-auth conversion surface
├── portfolio/
├── project/
├── contract/[id]/sign.tsx
├── workspace/
└── help/
```

### 4.2. Ключевые соответствия Product Scope Freeze (2026-05-09)
- ✅ Expo `/admin/*` = **только operational cockpit** (alerts, QA approve, payout-batch approve, withdrawal). Полный admin — на web.
- ✅ Expo Tester — 4 экрана (home / list / detail / history), backend готов (13 endpoints).
- ✅ Lead — **не отдельная роль**, а pre-auth conversion screen.

### 4.3. Runtime client
Все 43 `import api` в Expo роутятся через `frontend/src/runtime/*` middleware (token-prime, telemetry, retry, request-id propagation). Web аналогично — `web/src/runtime/*`.

---

## 5. Интеграции — режимы

| Capability | Mode | Provider | Env-флип |
|---|---|---|---|
| payment | mock | mock-payment | `STRIPE_SECRET_KEY` (есть test-key в pod) |
| mail | mock | mock-mail | `RESEND_API_KEY` |
| storage | mock | mock-storage | `CLOUDINARY_*` |
| oauth | unavailable | mock-oauth | `GOOGLE_CLIENT_ID` |
| ai | **готов** | emergent-llm | `EMERGENT_LLM_KEY` ✅ выставлен сейчас |
| settlement-stripe | DORMANT | adapter ready | `STRIPE_API_KEY` |
| settlement-paypal | DORMANT | adapter ready | `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` + `PAYPAL_WEBHOOK_ID` |
| sentry | DORMANT | observability ready | `SENTRY_DSN` |

`GET /api/integrations/manifest` возвращает честный статус для UI.

---

## 6. Audit findings

### 6.1. ✅ Что в идеальном состоянии
1. **Money substrate Phase 2C-B SEALED** — canonical ledger + projections + AST-guards. Никакого client-side `.reduce()` для агрегаций — `web/scripts/audit/web_p6_master.py` enforce'ит.
2. **Web stabilization line SEALED** (P3+P4+P5+P6) — single runtime-client, backend-authority discipline, RootErrorBoundary, ToastBridgeMount.
3. **Contracts P3..P8 SEALED** — data-minimization (нет паспортов/биометрии), Fernet AES-128-CBC, GDPR export/erasure, 5 admin oversight endpoints.
4. **Payouts V2 P0+P1+P2A+P3+P4+P5 SEALED** — рабочий + наблюдатель + UI. Готов к flip-to-live по `STRIPE_SECRET_KEY`.
5. **Observability** — Sentry в no-op без DSN, всё капчится в `client_errors` collection даже без Sentry.
6. **Auth** — все 4 роли (admin/john/client/tester) логинятся, RBAC-403 проверен на admin-only endpoints.

### 6.2. 🟡 Open / pending (по `memory/active_issues.md`)
**Все code-side phases закрыты.** Открытые пункты = **env-флипы**:

1. **Resend live email** — выставить `RESEND_API_KEY` + `RESEND_FROM_EMAIL`.
2. **Stripe Connect live** — `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, зарегистрировать webhook URL в Stripe Dashboard.
3. **Cloudinary** — `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`.
4. **Sentry** — `SENTRY_DSN`.
5. **Reconciler live-truth** — заменить `_fetch_provider_truth_mock` на `stripe.Transfer.retrieve` (~40 LOC) когда Stripe live.

### 6.3. ⚠️ Замечания (не блокеры)
1. **`yarn.lock` отсутствовал в репозитории** — пересоздан при `yarn install` (37s). Это означает, что при следующих редеплоях из репо может всплыть mismatch версий. **Рекомендация:** закоммитить `yarn.lock` в репо.
2. **Tunnel timeout на холодном старте** — первый `expo start --tunnel` упал по ngrok timeout, на 3-й попытке supervisor поднял успешно. Это известный flake на cold-boot.
3. **3 hardcoded money literals** во фронтенде (P6 warn-only): `DeveloperGrowthPage`, `AdminPricingConfigPanel`, `DeveloperProfileEnhanced`. Не критично.
4. **`requirements.txt` содержит CUDA-пакеты** (`cuda-bindings`, `nvidia-cublas-cu13`, `torch==2.12.0` и т.д. — ~5GB). Раздувает образ. Если GPU не нужен — стоит переключиться на CPU-only `torch` и убрать nvidia-* пакеты.

---

## 7. Тестовые учётные данные

Сохранены в `/app/memory/test_credentials.md`:

| Роль | Email | Пароль |
|---|---|---|
| Admin | admin@atlas.dev | admin123 |
| Developer | john@atlas.dev | dev123 |
| Client | client@atlas.dev | client123 |
| Tester | tester@atlas.dev | tester123 |

---

## 8. Что было сделано в этом редеплое

1. ✅ Клонировал `svetlanaslinko057/5757576YT7` → `/tmp/repo_audit` (17 188 файлов).
2. ✅ Rsync в `/app` с сохранением `.env`, `.git`, `.emergent`, `frontend/node_modules`, `.metro-cache`.
3. ✅ Установил backend deps: `pip install -r requirements.txt --no-cache-dir` (170 пакетов).
4. ✅ Установил frontend deps: `yarn install` (39 пакетов в lock).
5. ✅ Дописал `EMERGENT_LLM_KEY` + `CORS_ORIGINS="*"` в `backend/.env`.
6. ✅ Восстановил `memory/test_credentials.md`.
7. ✅ `supervisorctl restart backend expo` → оба зелёные.
8. ✅ Smoke-тесты по 11 точкам (см. §2).
9. ✅ Скриншот Welcome screen Expo — рендерится корректно.

---

## 9. Рекомендации на следующий шаг

Стабилизационная линия sealed, freeze на новые фичи снят. По `memory/PRD.md` §"What's unblocked now" доступно:

- **AI / automation** — `EMERGENT_LLM_KEY` уже в `.env`, можно подключать в фичу
- **Analytics**
- **Payout V2 → P2B** (PayPal live) — последний кусок до полностью живых выплат
- **Billing V2**
- **Forecasting**
- **Growth / referral expansion**
- **Operator systems**

**Лёгкий путь к "wow":**
1. Активировать AI-фичу (например, `/api/cognition/*` с реальной моделью через `EMERGENT_LLM_KEY`).
2. Закоммитить `yarn.lock` обратно в репо для стабильности будущих редеплоев.
3. (Опционально) Slim'нуть `requirements.txt` от CUDA — экономия ~5GB образа.

---

**Готов к следующему шагу. Жду указаний.**
