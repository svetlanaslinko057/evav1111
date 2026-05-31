# Полный аудит и развёртывание — 2026-FEB (session E1, repo 212w123123)

> **Репозиторий:** `https://github.com/svetlanaslinko057/212w123123`
> **Кодовое имя проекта:** **ATLAS DevOS** (бренд фронтенда — **EVA-X**)
> **Workspace:** `/app` (Emergent preview pod)
> **Preview host:** `https://mobile-app-expo-14.preview.emergentagent.com`
> **Дата:** 2026-FEB
> **Тип:** full GitHub redeploy + dependency reinstall + supervisor restart + smoke-аудит

См. также: `AUDIT_2026-FEB_FULL_REDEPLOY_E1_RU.md` (предыдущий снимок этой же фазы из репозитория). Этот файл фиксирует свежее развёртывание текущей сессии.

---

## 0. TL;DR

| Слой | Статус | Адрес |
|------|--------|-------|
| **Backend** (FastAPI + Motor + Socket.IO) | 🟢 RUNNING | supervisor `backend`, `:8001` |
| **Expo** (RN SDK 54 + expo-router) | 🟢 RUNNING | supervisor `expo`, `:3000` + tunnel |
| **Web CRA** (React 19 + craco + Tailwind + Radix) | 🟢 SERVED | бэкенд раздаёт `/app/web/build/` → `/api/web-ui/` |
| **MongoDB** | 🟢 RUNNING | `mongodb://localhost:27017/test_database` |
| `/api/healthz` | 🟢 `{"status":"ok"}` | — |
| `/api/readyz` | 🟢 `{"ready":true,"checks":{"mongo":true,"config":true}}` | — |
| `/api/web-ui/` | 🟢 HTTP 200 | — |
| Expo `/` | 🟢 HTTP 200 (Metro bundle, 1555 modules) | — |
| Auth login `admin@atlas.dev / admin123` | 🟢 200 + cookie | — |
| OpenAPI | 🟢 **727** маршрутов | `/openapi.json` |
| Seed-блоки | 🟢 все отработали | см. §3.3 |
| Интеграции | 🟡 все в MOCK (Stripe / Resend / Cloudinary / Google OAuth) | `/api/integrations/manifest` |
| `EMERGENT_LLM_KEY` | 🟢 подключён в `backend/.env` | — |
| Лендинг EVA-X | 🟢 рендерится (скриншот сделан) | — |

**Все три плоскости (Backend / Expo / Web) отвечают 200. Готов к продолжению разработки.**

---

## 1. Что было сделано

1. **Бэкап ENV** — `backend/.env` и `frontend/.env` сохранены в `/tmp/env_backup/`.
2. **Клон** `svetlanaslinko057/212w123123` в `/tmp/repo_clone` (172 MB).
3. **`rsync -a --delete`** в `/app/`, исключая `.git`, `.emergent`, `node_modules`, `.metro-cache`, `.expo`, `*.env`.
4. **Восстановление `.env`** из бэкапа.
5. **Очистка диска** — `pip cache purge` освободил 3 GB (был 100 % full).
6. **`pip install -r requirements.txt`** в `/app/backend` — успешно (136 пакетов).
7. **`yarn install`** в `/app/frontend` — был только peer-warning `expo-audio → expo-asset`.
8. **`yarn expo install expo-asset`** — закрыли peer-dep, `~12.0.13` (SDK 54-совместимая версия).
9. **`EMERGENT_LLM_KEY`** добавлен в `backend/.env`.
10. **`supervisorctl restart backend expo`** — оба процесса стартовали, seed-блоки прошли.
11. **`/app/memory/test_credentials.md`** восстановлен (отсутствовал в репо).
12. **Smoke-тесты** — `/api/healthz`, `/api/readyz`, `/api/web-ui/`, `:3000/`, `POST /api/auth/login`, `GET /api/auth/me`, `/openapi.json` (727 paths).
13. **Скриншот лендинга** — EVA-X тёмная тема рендерится корректно.

---

## 2. Архитектура репозитория

```
/app
├── backend/                     ← FastAPI 0.115 + Motor + Socket.IO (Python 3.11)
│   ├── server.py                ← 27 497 строк, монолит-фасад
│   ├── api/adapters/            ← web/mobile boundary
│   ├── domains/money/           ← Money substrate (Phase 2C-B SEALED)
│   ├── integrations/            ← registry + base + mocks + live_adapters
│   ├── infrastructure/db/       ← Mongo repositories (users/projects/modules/money)
│   ├── middleware/              ← request_id, error_shape, compat_observability
│   ├── payment_providers/       ← stripe, wayforpay, mock
│   ├── services/                ← pricing_service.py
│   ├── shared/                  ← config, constants, errors, events, logging
│   ├── tests/                   ← 40 pytest-файлов
│   ├── requirements.txt         ← 136 пакетов
│   └── 80+ слойных модулей
│
├── frontend/                    ← Expo SDK 54.0.34 + expo-router 6 (RN 0.81)
│   ├── app/                     ← 97 .tsx-роутов (admin/, client/, developer/, tester/,
│   │                              operator/, project/, contract/, lead/, help/,
│   │                              auth.tsx, gateway.tsx, two-factor-*, hub, account,
│   │                              describe/estimate-*/project-booting, …)
│   ├── src/                     ← компоненты, утилиты, storage, i18n, theme
│   ├── app.json                 ← плагины (audio, image-picker, location, notifications…)
│   └── package.json             ← 60+ deps
│
├── web/                         ← React 19 + CRA-craco + Tailwind + Radix
│   ├── build/                   ← готовый bundle, отдаётся бэкендом под /api/web-ui/
│   ├── src/                     ← 94 страницы в src/pages/
│   └── ARCHITECTURE.md
│
├── packages/, tools/, scripts/  ← shared workspaces / maintenance utils
├── audit/                       ← 90+ markdown / JSON артефактов фаз 1 / 2A / 2B / 2C
├── docs/                        ← active-audits, charters, observation snapshots
├── memory/                      ← PRD.md, active_issues.md, test_credentials.md (восстановлен)
└── tests/                       ← legacy placeholder
```

**Boundary layer:** бизнес-логика видит только capability (`payment / mail / storage / oauth / ai / settlement`) через `backend/integrations/registry.py`. Имена вендоров живут только в `live_adapters.py` и `payment_providers/*`.

---

## 3. Backend — поверхность и состояние

### 3.1 Точки входа (live)

| Endpoint | Status |
|----------|--------|
| `GET /api/healthz` | 200 `{"status":"ok"}` |
| `GET /api/readyz` | 200 `{"ready":true,"checks":{"mongo":true,"config":true}}` |
| `GET /api/` | 200 `{"message":"Development OS API","version":"1.0.0"}` |
| `GET /api/web-ui/` | 200 (CRA index.html) |
| `GET /api/integrations/manifest` | 200 — все capabilities в `mock` |
| `POST /api/auth/login` `admin@atlas.dev / admin123` | 200 + `session_token` cookie |
| `GET /api/auth/me` (с cookie) | 200 |
| `GET /openapi.json` | 200, **727** маршрутов |

### 3.2 Распределение маршрутов по доменам

```
259  /api/admin        ← самая большая поверхность (CRM + ops + dev pool)
 73  /api/developer    ← кабинет разработчика
 66  /api/client       ← кабинет клиента
 23  /api/modules
 23  /api/account
 22  /api/payouts-v2
 19  /api/execution-intelligence
 18  /api/auth         ← login/register/2FA/reset/google/demo/role
 13  /api/ai
 12  /api/contracts
 10  /api/system
 10  /api/mobile
  …
```

### 3.3 Seed-блоки (отработали в этом старте)

| Seed | Что создано |
|------|-------------|
| `Seeded mock providers` | mock-payment / mock-mail / mock-storage / mock-oauth |
| `Seeded portfolio cases` | публичная витрина |
| `Created admin user` | legacy `admin@devos.io / admin123` |
| **Quick-access users** | 5 аккаунтов `*@atlas.dev` (см. §7 и `memory/test_credentials.md`) |
| `DEV POOL` | 6 devs, 89 modules, 81 QA decisions, 6 canonical money states |
| `Demo project Acme Analytics Platform` | для `client@atlas.dev`, 3 модуля |
| `MOCK SEED` | 2 projects, 7 modules, 6 earnings, 6 invoices, 2 deliverables, 3 tickets, 3 notifications, 7 cognition actions |
| `SEED_REPLAY: boot_replay_v1` | 14-дневный replay: 16 overrides + 14 qa_fail + 19 reassign + 12 overload + 9 suppression |
| `TESTER SEED` | 5 валидаций + 1 issue → `tester@atlas.dev` |
| `4 scope templates / system config / MONEY LEDGER indexes` | системные дефолты |
| `INTEGRATIONS seed` | wayforpay / stripe / app / payments |

### 3.4 Фоновые петли

| Daemon | Период |
|--------|--------|
| `module_motion` | 15 s |
| `mock advancer` (payouts v2) | 5 s |
| `payouts v2 reaper` | 30 s |
| `auto_guardian` | 120 s |
| `team_balancer` | 120 s |
| `operator_engine scheduler` | 300 s |
| `event_engine scanner` | 15 min |
| `payouts_v2_reconciler` | 30 min |
| `legal contract reminder` | 6 h |

### 3.5 Безопасность

- bcrypt для паролей.
- `session_token` cookie HttpOnly, ≈6 месяцев TTL.
- SlowAPI rate-limit на `/api/auth/login` — **10 req/min с IP**.
- `request_id` middleware, унифицированная `error_shape` JSON: `{ok, code, message, status, retryable, request_id}`.
- CORS включён.

### 3.6 Money substrate (запечатано, Phase 2C-B SEALED)

`money_ledger_events` — единственный canonical writer; `dev_wallets_projection` — read model; `dev_wallets` — frozen diagnostic mirror; `money_divergence` — passive observer (5 AST covenants). Conservation invariant `Σ ac_dev + Σ ac_reserved + Σ ac_ext` держится. 8 AST guard tests + 75 acceptance tests.

⚠️ **Запрет:** править `dev_wallets`, `money_divergence`, `users.total_earnings`, `payouts`, `earnings`, `task_earnings` без classification rule из `audit/SUBSTRATE_GOVERNANCE_CHARTER.md` §2.

---

## 4. Frontend (Expo)

- **SDK 54.0.34**, `expo-router 6.0.22`, `react 19`, `react-native 0.81.5`, `newArchEnabled: true`, `reanimated 4`, `worklets 0.5`.
- `EXPO_PUBLIC_BACKEND_URL` = `https://mobile-app-expo-14.preview.emergentagent.com`.
- Tunnel запущен (`expo start --tunnel --port 3000`), `CI=true`, `EXPO_USE_FAST_RESOLVER=1`.
- Bundle: **1 555 modules**, тёплая сборка ~4.4 s.
- Провайдеры в `app/_layout.tsx`: `Auth / AuthGate / Feedback / StateShift / Validator / I18n / Theme / SafeArea` + `AppHeader` + `BottomTabs`. Logic прогрева icon-ассетов сохранена.
- Capability manifest fetch с timeout 1.5 s.

**Runtime warnings (некритичные, web-only):** deprecated `pointerEvents` / `shadow*`, `borderColor: var(--t-primary)33` (кастомные CSS-vars не поддерживаются web-target'ом RN), `expo-notifications` не работает на web.

---

## 5. Web CRA

- `/app/web/build/index.html` готов, заголовок `ATLAS DevOS — operational execution platform`.
- Бекенд раздаёт через `GET /api/web-ui` и `GET /api/web-ui/{full_path:path}` (SPA fallback).
- React Router v7 (`basename={process.env.PUBLIC_URL}`), Radix UI, Tailwind 3 + craco alias `@ → src`, cookie-based auth.
- 94 страницы в `src/pages/`.
- PostHog встроен.
- Тема: `localStorage.atlas_theme` (`dark` / `light`).

**Активная аудит-линия:** `docs/active-audits/WEB_STABILIZATION_LINE.md` — WEB-P1 ✅ / WEB-P2…P6 pending. **Hard rule:** новые продуктовые фичи поверх — запрещены до закрытия линии.

---

## 6. Зоны риска и открытые баги

### 6.1 🟡 Все интеграции в MOCK

```
StripeConnect adapter  DORMANT — STRIPE_API_KEY missing
PayPalPayouts adapter  DORMANT — PAYPAL_CLIENT_ID/SECRET/WEBHOOK_ID missing
RESEND_API_KEY         not set — email delivery disabled
CLOUDINARY             MOCK mode (files saved locally)
GOOGLE_CLIENT_ID       missing — OAuth unavailable
AI mode=mock           LLM key present, но INTEGRATIONS_LIVE_ENABLED!=1
```

Для live-mode: положить ключи в `backend/.env` + `INTEGRATIONS_LIVE_ENABLED=1`. Минимум для go-live: `RESEND_API_KEY`, `STRIPE_*`, `CLOUDINARY_*`.

### 6.2 🟢 EMERGENT_LLM_KEY подключён

Через `emergent_integrations_manager`. Активация AI требует `INTEGRATIONS_LIVE_ENABLED=1` (политика Этапа 5.0).

### 6.3 🟡 OpenAPI Duplicate Operation ID warnings

10+ warnings о дубликатах `operationId` (`pass_validation`, `fail_validation`, `audit_log`, `list_users_v2`, `block_user`, `unblock_user`, `change_role`, `logout_all`, `soft_delete`, `get_user_detail`). Не блокирует runtime, но `/openapi.json` теряет уникальность ID. Решение — явные `operation_id=` в декораторах.

### 6.4 🟡 Expo tunnel: ранние Premature-close

В `expo.err.log` ранее были крэши ngrok. Сейчас `Tunnel ready` стабильно.

### 6.5 🟡 ML-стек `sentence-transformers` lazy

`requirements.txt` содержит `sentence-transformers / transformers / tokenizers`, но в backend-логах не видим init (`AI templates fallback to heuristic`). Если semantic-search шаблонов критичен — проверить `template_engine.py`.

### 6.6 🟡 Pytest не прогонялся

40 файлов в `backend/tests/`. По запросу — прогоню; часть тестов требует миграции с захардкоженных preview-доменов на `EXPO_PUBLIC_BACKEND_URL` и `asyncio_mode = "auto"` в `pytest.ini`.

### 6.7 🟡 Открытые аудит-линии

| Линия | Статус |
|-------|--------|
| `WEB_STABILIZATION_LINE` | WEB-P1 ✅ / WEB-P2…P6 pending |
| `WEB_AUDIT_2026-02-FEB__ACTIVE` | 6 of 14 закрыто, 8 открыто |

### 6.8 🟢 Серьёзных регрессий не обнаружено

Money substrate цел, seed идемпотентен, daemons стартуют, healthz/readyz/web-ui/openapi отвечают 200.

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

Полная справка — `/app/memory/test_credentials.md`.

---

## 8. Что нужно от пользователя

1. **Решить, какие интеграции flip-нуть в `live`** (§6.1):
   - `EMERGENT_LLM_KEY` ✅ уже стоит — нужен только `INTEGRATIONS_LIVE_ENABLED=1`
   - `RESEND_API_KEY` (email/OTP)
   - `CLOUDINARY_*` (хранилище файлов)
   - `STRIPE_*` (тестовая оплата)
2. **Подтвердить приоритет следующей фазы:**
   - a) Закрывать `WEB_STABILIZATION_LINE` (WEB-P2 hygiene → P6 governance)
   - b) Expo hardening (deprecated style props, CSS-vars → hex/rgba, permissions, manifest)
   - c) Прогнать `pytest` и привести в зелёное
   - d) Что-то конкретное по модулю
3. **Live-mode flip checklist:** ключи → `INTEGRATIONS_LIVE_ENABLED=1` → `supervisorctl restart backend` → smoke `/api/payouts-v2/health`, `/api/integrations/manifest`.

---

## 9. Изменения в коде в этой сессии

- `backend/.env` — добавлен `EMERGENT_LLM_KEY`.
- `frontend/package.json` / `yarn.lock` — `yarn expo install expo-asset@~12.0.13`.
- `memory/test_credentials.md` — восстановлен.
- `audit/AUDIT_2026-FEB_FULL_REDEPLOY_E1_RU_v2.md` — **этот файл**.

Бизнес-код не трогался.

---

## 10. Чек-лист «всё ли поднялось»

- [x] `supervisorctl status` → `backend RUNNING`, `expo RUNNING`, `mongodb RUNNING`, `nginx-code-proxy RUNNING`
- [x] `curl /api/healthz` → 200
- [x] `curl /api/readyz` → 200
- [x] `curl /api/web-ui/` → 200
- [x] `curl :3000/` (Expo) → 200
- [x] `POST /api/auth/login admin@atlas.dev/admin123` → 200 + session cookie
- [x] `GET /api/auth/me` (с cookie) → 200
- [x] OpenAPI: 727 routes
- [x] Все seed-блоки выполнены
- [x] Background daemons стартовали
- [x] `/app/memory/test_credentials.md` восстановлен
- [x] Скриншот лендинга EVA-X сохранён
- [x] Money substrate цел
- [x] `EMERGENT_LLM_KEY` подключён
- [x] Tunnel `Tunnel ready`
- [ ] Flip интеграций в live (по запросу)
- [ ] Pytest прогон (по запросу)
- [ ] WEB_STABILIZATION_LINE P2 → P6 (отдельная итерация)

---

**Аудит завершён. Жду указаний по приоритету (§8).**
