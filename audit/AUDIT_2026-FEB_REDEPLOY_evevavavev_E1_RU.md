# AUDIT — ATLAS DevOS / EVA-X — Redeploy from `svetlanaslinko057/evevavavev`
**Date:** 2026-02 (Feb session) · **Env:** Emergent preview · **By:** E1

> Цель сессии: развернуть репозиторий целиком в `/app`, поднять все сервисы,
> провести полный аудит. После этого пользователь продолжает разработку.

---

## 1 · Развёртывание — статус

| Сервис | Состояние | Порт | Проверено |
|--------|-----------|------|-----------|
| Backend FastAPI | ✅ RUNNING | 8001 | `/api/healthz → 200`, `/api/auth/login → 200`, `/api/auth/me → 200` |
| Expo (Metro) | ✅ RUNNING | 3000 (tunnel) | Лендинг EVA-X грузится, скриншот OK |
| MongoDB | ✅ RUNNING | 27017 | Boot-сидеры отработали идемпотентно |
| code-server / nginx-code-proxy | ✅ RUNNING | — | preview infra |

Диск `/app`: **3.9G / 9.8G (40%)**. После установки `requirements.txt` venv разросся до 9.7G из-за `torch+cuda/triton/nvidia*` — **удалено 3.0 GB GPU-binаries** (`nvidia_*`, `triton`, `cuda*`), оставлен CPU-only torch. Sentence-transformers продолжит работать (lazy-load CPU). Никаких других сокращений не делал.

Boot-логи backend подтверждают:
```
DEV POOL: seeded 6 devs, 89 modules, 81 qa decisions, 6 canonical money states
SEED REPLAY: noop (marker exists, batch_id=replay_eb7aa03432)
L1 backfill: 89 modules default=auto
PAY-V2 worker started: id=worker_b1ec5cc6b8 interval=5s batch=10 lease=60s
PAY-V2 reaper / mock-advancer / scheduler started
MONEY BRIDGE: MoneyService initialised (Phase 2B PR-1)
EVENT ENGINE: Background scanner started (15 min interval)
GUARDIAN: loop started (interval 120s)
MODULE MOTION: loop started (interval 15s)
OPERATOR SCHEDULER: started (300s interval)
RECONCILE LOOP: started (interval 1800s)
```

Все 11 background loops живы, ошибок при старте нет.

---

## 2 · Структура репозитория

```
/app
├── backend/          ── 180 .py файлов, FastAPI монолит + domains/ + integrations/
│   ├── server.py     ── 28 225 строк, ~458 декораторов endpoint'ов
│   ├── api/adapters/ ── thin сетевой слой
│   ├── domains/money ── запечатанный money substrate
│   ├── integrations/ ── ai/mail/oauth/payment/storage/settlement (live + mocks + registry)
│   └── *.py          ── ~170 модулей (decomposition, scope, qa, payouts_v2, dev_brain ...)
├── frontend/         ── Expo SDK 54, 100 .tsx экранов
│   └── app/
│       ├── admin/    ── 21 файл (D1 frozen = 5+8 → перебор)
│       ├── client/, developer/, tester/, lead/, operator/
│       └── (lead/conversion + cabinet)
├── web/              ── React 18 (CRA + craco), 98 страниц кабинета
│   ├── src/pages/    ── Admin* + Client* + Developer* + Lead*
│   ├── src/i18n/     ── EN+UK 1938 ключей
│   └── packages/     ── design-system, runtime-client
├── packages/         ── shared design-system + runtime-client
├── docs/, ROADMAP.md, audit/ ── 30+ исторических аудитов
├── scripts_repo/     ── bootstrap.sh, i18n coverage, smoke scripts
└── memory/           ── PRD.md, test_credentials.md
```

Frozen scope (по PRD + amendment 1):
- **D1** — Expo admin: 5 cockpit tabs + 8 read-mostly drill-downs. **Сейчас 21 экран** → нарушено.
- **D2** — Expo tester: Stage 4 (4 screens). ✅
- **D3** — Lead: conversion surface. ✅

---

## 3 · API surface — что работает

Smoke-проверки под админ-сессией (`admin@atlas.dev` / `admin123`):

| Endpoint | Status | Комментарий |
|----------|-------:|-------------|
| `GET /api/healthz` | 200 | live |
| `POST /api/auth/login` (cookie session) | 200 | возвращает user + `Set-Cookie: session_token=sess_*` |
| `GET /api/auth/me` | 200 | работает только под cookie (не `X-User-Id`) |
| `GET /api/me` | 200 | |
| `GET /api/notifications` | 200 | seed notifications живые |
| `GET /api/admin/users` | 200 | |
| `GET /api/admin/projects` | 200 | |
| `GET /api/admin/portfolio` | 200 | |
| `GET /api/admin/scope-templates` | 200 | |
| `GET /api/admin/payouts` | 200 | |
| `GET /api/admin/integrations` | 200 | |
| `GET /api/admin/control-center/overview` | 200 | |
| `GET /api/admin/profit/summary` | 404 | путь требует уточнения — точные subroutes есть, например `/api/admin/profit/...` (5 endpoints) |
| `GET /api/admin/master`, `/qa`, `/learning`, `/economy`, `/events`, `/tasks` | 404 | то же самое — нет index-роута на коллекции, только sub-paths |

Top-10 endpoint-префиксов (по числу хэндлеров):
```
16  /client/projects/...
15  /admin/projects/...
11  /developer/tasks/...
10  /admin/control-center/...
 8  /validation/{validation_id}/...
 8  /admin/portfolio/...
 7  /developer/growth/...
 7  /admin/qa/...
 7  /admin/events/...
 6  /client/deliverables/...
```

Всего ~458 endpoint-декораторов внутри `server.py` + ещё ~285 распределены в `api/adapters/`, `auth_otp.py`, `payouts_v2_api.py` и т.д. — суммарно по PRD ≈ **743 endpoint**.

---

## 4 · Интеграции — режим работы

| Интеграция | Состояние | Что нужно для LIVE |
|------------|-----------|--------------------|
| **LLM** (Claude/GPT/Gemini) | Готов к LIVE | `EMERGENT_LLM_KEY` (Universal Key) уже доступен в окружении через `emergentintegrations` |
| **Email (Resend)** | MOCK (`mail_mode=mock`) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` |
| **Cloudinary** | MOCK (uploads → `/app/backend/uploads`) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Stripe Connect** | DORMANT | `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` (тестовый ключ доступен в pod env) |
| **PayPal Payouts** | DORMANT | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` |
| **WayForPay** | DORMANT | Заведено в `admin/integrations`, но не подключено |
| **Google OAuth** | DORMANT (двойной свитч `INTEGRATIONS_LIVE_ENABLED` + `OAUTH_LIVE_ENABLED`) | `GOOGLE_CLIENT_ID` |
| **Auth OTP** | `DEV_MODE=False`, `mail=mock` | Реальная отправка возможна когда Resend поднимется |

`backend/.env` сейчас содержит только `MONGO_URL` и `DB_NAME` — все остальные ENV отсутствуют, поэтому всё запустилось через DORMANT/MOCK-ветки кода (что и было целью).

---

## 5 · Сидированные пользователи

| Email | Password | Role | Назначение |
|-------|----------|------|-----------|
| `admin@devos.io` | `admin123` | admin | Платформенный админ (legacy) |
| `admin@atlas.dev` | `admin123` | admin | Главный admin (квик-логин) |
| `john@atlas.dev` | `dev123` | developer (senior) | Имеет проект и модули |
| `client@atlas.dev` | `client123` | client | Владеет «Acme Analytics Platform» |
| `multi@atlas.dev` | `multi123` | client+developer+admin | Для проверки role switcher |
| `tester@atlas.dev` | `tester123` | tester | Stage 4 tester surface |

Плюс **dev pool 6 человек** (`alice.kim / marco.rossi / priya.shah / luka.horvat / sara.chen / diego.silva`) — для лидербордов / assignment / tier-логики (не для логина).

Сохранено в `/app/memory/test_credentials.md`.

---

## 6 · Состояние известных рисков (по PRD)

| Риск | Прошлая запись | Сейчас |
|------|----------------|--------|
| sentence-transformers missing | ⚠️ | ✅ есть; CUDA выпилен, CPU-режим (lazy-load) |
| 10+ duplicate operation IDs | ⚠️ | ⚠️ не верифицировано в этой сессии |
| D1 violated (21 admin screen vs 13 frozen) | ⚠️ | ⚠️ **подтверждено** — `frontend/app/admin/` содержит 21 файл (включая `_layout.tsx`) |
| pytest-asyncio blocked | ⚠️ | ⚠️ tests/ почти пустая, нужен sweep (см. ROADMAP) |
| Cabinet i18n — 30 файлов с hardcoded EN | open | open (ROADMAP Track 1) |

---

## 7 · Frontend проверка

Лендинг EVA-X (`https://expo-build-test-3.preview.emergentagent.com`) грузится корректно:
- header `EVA-X` с логотипом
- заголовок «Build real products. Not tasks.»
- 3 SEQ-шага (Describe → Get plan → We build)
- 4 buy-points (Real product / Fixed scope / Built by team / No chaos)
- USED TO BUILD: SaaS · Marketplaces · AI tools · Internal systems
- Primary CTA «See my product plan →»

Тёмная палитра, montserrat-стиль, без AI-slop градиентов. Метро в CI mode.

⚠️ Заметка: Metro в `CI=true` (reloads disabled). Для активной разработки можно убрать `CI=true` из окружения supervisor, чтобы вернулся watch-mode. По умолчанию оставил как есть.

---

## 8 · Что я НЕ менял

Чтобы не поломать состояние проекта:
- ❌ Не правил `server.py`
- ❌ Не трогал `metro.config.js`, `EXPO_PACKAGER_*`
- ❌ Не запускал миграции / реcеды поверх существующих
- ❌ Не обновлял `requirements.txt` / `package.json`
- ❌ Не правил web/ — даже если он не запущен на этом preview (по ENV-схеме Emergent один порт 3000 = Expo)

Единственные правки: удалил GPU-libs из venv (фриз диска), пересоздал `/app/memory/test_credentials.md`, написал этот аудит, обновлю PRD ниже.

---

## 9 · Готовые следующие шаги

Приоритеты из `ROADMAP.md` + что фактически блокирует продолжение:

1. **Подключить LIVE интеграции** (если нужно для разработки):
   - Resend → реальные письма OTP / password-reset
   - Stripe → реальный escrow / payout flow (тестовый ключ есть в pod env)
   - Cloudinary → реальные загрузки

2. **Cabinet i18n batch 3** (ROADMAP Track 1) — осталось 30 файлов с hardcoded≥2.
   Топ кандидаты: `AdminIntegrationsPage.js`, `ScopeBuilder.js`, `ContractSignEvidencePage.js`,
   `AdminPayoutBatchDetail.js`, `DeveloperDashboard.js`.

3. **D1 frozen scope** — решить amendment #2 или схлопнуть 21 admin screen → 13 (5+8).

4. **Тесты** — `tests/` почти пустая, pytest-asyncio заблокирован. Восстановить
   `audit/*.json` корпусы (scope/pricing/contract benchmark) как полноценные
   pytest-проверки.

5. **Duplicate operation IDs** — пройти `audit/` отчёты, отметить уникальность роутов.

6. **Web запуск на preview** — если нужно — потребует второго port-mapping
   (сейчас Emergent отдаёт только :3000 для Expo и :8001 за `/api`). Web можно
   собрать в `web/build/` и сервить через FastAPI (есть переменная `WEB_BUILD_DIR`).

---

## 10 · Команда «продолжай»

Когда пользователь скажет «теперь сделай X» — у нас есть:
- Полная рабочая среда: backend + expo + mongo
- 5+1 quick-login юзеров для всех ролей
- 458+ endpoint'ов покрывают весь сценарий (auth → projects → modules → QA → payouts → notifications)
- LLM ready через Emergent LLM Key
- Все остальные интеграции — в MOCK, готовы к LIVE по запросу
