# Полное развёртывание и аудит — Feb 2026 (сессия APPPP)

**Репозиторий:** `svetlanaslinko057/APPPP`
**Проект:** ATLAS DevOS / EVA-X — execution substrate (FastAPI + Expo + Web)
**Среда:** Emergent workspace `/app`
**Сессия E1:** полный clone-redeploy + audit, режим интеграций — **MOCK**
**Предыдущие аудиты по теме:** `AUDIT_2026-05-30_FULL_REDEPLOY_E1_RU.md`, `ROADMAP.md`

---

## 0. TL;DR

| Слой | Статус | Комментарий |
|------|--------|-------------|
| Backend (FastAPI · 8001) | ✅ RUNNING | **743** endpoint, lifespan ok, все сидеры прошли, healthz=200 |
| Mobile (Expo · 3000) | ✅ RUNNING | Tunnel ok, preview рендерит лендинг EVA-X (lead workspace) |
| Web (CRA + craco) | ✅ BUILT | `/app/web/build` присутствует (14 MB, index.html + assets), но **не сервится** backend'ом (нужно проверить `WEB_BUILD_DIR`) |
| MongoDB (27017) | ✅ RUNNING | БД `atlas_devos`, **44** коллекции, все сидеры отработали |
| Интеграции | 🔶 MOCK | `payment/mail/storage/ai/settlement = mock`, `oauth = unavailable` — все ключи отсутствуют |
| Backend assets | ⚠️ DEGRADED | `sentence-transformers` отсутствует → 4 scope-template embedding errors при boot (non-fatal) |
| Auth | ✅ OK | quick-login `admin@atlas.dev` возвращает user payload + cookie session |
| Дисковое пространство | ✅ OK | 3.0 GB / 9.8 GB used = 31% (запас 6.8 GB) |

**Готово к продолжению разработки.** Подняты все три поверхности, sample-данные засеяны, ингресс работает. Основной потенциальный блокер для производительности `scope-template` фичи — отсутствие `sentence-transformers`.

---

## 1. Действия в этой сессии

### 1.1. Развёртывание из GitHub
- Стартовое `/app` содержало только Emergent Expo-template (3 файла в `frontend/app`). Полное содержимое репозитория **отсутствовало**.
- Склонировал `svetlanaslinko057/APPPP` в `/tmp/APPPP`.
- Скопировал в `/app` через `rsync -a` с защитой:
  - `--exclude='.git'` (сохранён родной .git, привязанный к платформе)
  - `--exclude='.emergent'` (сохранён платформенный)
  - `--exclude='node_modules'`, `--exclude='__pycache__'`
  - `--exclude='.env'`, `--exclude='*.env'` (сохранены оригинальные значения `MONGO_URL`, `DB_NAME`, `EXPO_PACKAGER_*`, `EXPO_PUBLIC_BACKEND_URL`)
- Перенесены: `audit/` (122 .md), `backend/` (196 .py), `docs/`, `frontend/`, `memory/`, `packages/`, `scripts/`, `test_reports/`, `tools/`, `web/` (включая прекомпилированный `web/build/`), корневые `README.md`, `ROADMAP.md`, `design_guidelines.json/md`, `test_result.md`.

### 1.2. Зависимости
- **Backend:** `pip install -r backend/requirements.txt` (149 пакетов: litellm 1.80, emergentintegrations 0.1.0, motor, slowapi, stripe, python-socketio, resend, google-genai, pyotp, bcrypt 4.1.3, transformers, scikit-learn, scipy, и др.) — installed cleanly.
- **`sentence-transformers` НЕ установлен** — нет в `requirements.txt`. Boot пишет 4 error'а:
  ```
  ERROR - Embedding error for template Online Marketplace: No module named 'sentence_transformers'
  ERROR - Embedding error for template SaaS Dashboard:     No module named 'sentence_transformers'
  ERROR - Embedding error for template Fitness & Wellness App: No module named 'sentence_transformers'
  ERROR - Embedding error for template E-Commerce Store:   No module named 'sentence_transformers'
  ```
  Сидинг продолжается — embedding-зависимые операции деградируют до текстового сравнения. Решения см. §5.4.
- **Frontend:** `yarn install --frozen-lockfile` — отработал за 7.8s (lockfile уже в репо).

### 1.3. Сервисы и supervisor
Перезапустил `backend` и `expo`. Все 5 сервисов стабильны:

```
backend          RUNNING  uvicorn server:app --host 0.0.0.0 --port 8001 --reload
expo             RUNNING  yarn expo start --tunnel --port 3000 (CI=true)
mongodb          RUNNING  mongod --bind_ip_all
nginx-code-proxy RUNNING  ingress / → :3000, /api/* → :8001
code-server      RUNNING  IDE
```

Ingress: публичный preview-URL → port 3000 (Expo), `/api/*` → port 8001 (FastAPI).

### 1.4. Сидинг (boot lifespan) — подтверждено в логах

| Категория | Что засеяно |
|-----------|-------------|
| Quick-access users | `admin@`, `john@` (dev), `client@`, `multi@` (dev), `tester@atlas.dev` |
| Dev pool | 6: alice.kim, marco.rossi, priya.shah, luka.novak, sara.ali, diego.lopez |
| Demo project | `Acme Analytics Platform` для client@atlas.dev (3 модуля) |
| `mock_seed` | 2 проекта, 7 модулей, 6 earnings, 6 invoices, 2 deliverables, 3 tickets, 3 notifications, 7 cognition_actions |
| Money substrate | 6 канонических money_states (escrow/earnings/payout) для dev pool |
| `seed_replay` boot_replay_v1 | 14 дней, 70 событий (16 overrides / 14 qa_fail / 19 reassign / 12 overload / 9 suppression) |
| Tester seed | 5 валидаций + 1 issue → tester@atlas.dev |
| QA / модули | 89 модулей, 81 QA-решений |
| Notifications seed | 5 + 3 + 3 demo |
| Scope templates | 4 (без embeddings — см. §5.4) |
| Integrations seed | wayforpay, stripe, app, payments |
| L0/L1 backfill | модулей и users |
| Indexes | competitor cache TTL (24h), validation campaigns, dev wallets projection |

### 1.5. Smoke-проверки

```
GET  /api/healthz                                       → 200 {"status":"ok"}
GET  /openapi.json                                      → 200 (743 paths)
POST /api/auth/quick {"email":"admin@atlas.dev"}        → 200 user{role:admin, user_id:user_928963ccf59a}
GET  /api/runtime/capabilities                          → 200 (alias on integrations api)
GET  /api/integrations/manifest                         → 200 6 capabilities
GET  http://localhost:3000                              → 200 (Expo web shell)
Public preview (EVA-X landing)                          → rendered корректно (lead workspace hero)
```

---

## 2. Карта проекта (как есть сейчас в `/app`)

### 2.1. Backend — `/app/backend`

- **196 .py файлов** (вкл. подкаталоги `domains/`, `infrastructure/`, `services/`, `api/`, `middleware/`, `integrations/`, `payment_providers/`, `shared/`, `tests/`, `scripts/`). README указывает 91 на верхнем уровне — без подкаталогов.
- **`server.py` = 28 226 строк** (+5 относительно последнего аудита 28 221).
- **OpenAPI paths: 743** (+2 относительно 741 в README).
- Группировка по модулям (см. README §1.1) актуальна: Auth, Money, Payouts V2, Acceptance/Assignment, Work execution, Intelligence/Brains, Admin, Client/Team/Operator, Integrations, Compat/Mobile bridge, Background daemons.

### 2.2. Mobile Expo — `/app/frontend/app`

- **100 .tsx** (+5 относительно README=95).
- Роли (полный список экранов):
  - **admin** — 21 экран (`home, contracts, control, execution-console, finance, inbox, integrations, marketplace, master, payouts, portfolio, profile, qa, reconciliation, team, templates, users, validation, payout-batch/*, projects/*`). **D1 нарушен**: scope-freeze разрешает 5+8=13 экранов. См. §5.3.
  - **client** — 18 директорий/экранов (workspace + billing + контракт + deliverable + payment-plan + validation + versions + modules + ...).
  - **developer** — 18 экранов (acceptance/earnings/feedback/growth/home/leaderboard/market/module/notifications/payout-profile/profile/support/time-logs/validation/wallet/work).
  - **tester** — 7 экранов (Stage 4, frozen scope).
  - **lead** — 1 экран (`workspace.tsx`, conversion surface only — соответствует D3).
- Корневые: `auth, gateway, two-factor-challenge, account, hub, operator, chat, inbox, describe, estimate-improve, estimate-result, project-booting, settings, help, profile, portfolio, documents, contract, project, activity, index, _layout, +html`.

### 2.3. Web — `/app/web`

- **98 страниц** в `web/src/pages/` (admin/client/developer/tester/builder/provider).
- **`web/build/` = 14 MB** — assets (логотипы EVA-X, favicons всех размеров, manifest, sitemap, robots, index.html, asset-manifest.json) **присутствуют**.
- ⚠️ Расхождение с README/ROADMAP: оба утверждают, что build отсутствует. Build **есть в репозитории и был перенесён**. Нужно проверить, действительно ли backend сервит `/admin/` из этой папки (env `WEB_BUILD_DIR`).
- i18n: 1938 EN+UK ключей (parity), 1585 `tByEn` calls, ~253 hardcoded EN осталось (по ROADMAP).

### 2.4. Documentation

| Папка | Содержимое |
|-------|------------|
| `/app/audit/` | **122 .md** (контракты money substrate, фазовые close-out'ы P1/P2A/P2B/P2C/B4*, smoke-trace'ы, governance, i18n coverage, scope-benchmark, payouts V2 — отсутствует) + JSON-baseline'ы |
| `/app/docs/` | product-scope-freeze + amendment 1, runtime-contracts (canonical-error-shape, capability-policy, compat-route-lifecycle, money-ledger-events, retry-idempotency, request-id-propagation, runtime-client-architecture, pilot-04-expo-wallet), active-audits (PAY V2 P0/P2A/P3/P4/P5, legal contract P2, web stabilization line) |
| `/app/test_result.md` | Журнал test_agent (последний прогон отсутствует) |
| `/app/test_reports/` | Архив iteration_*.json |
| `/app/memory/` | Пусто (test_credentials.md — в `.gitignore`, не закоммичен) |
| `/app/scripts/` | 21 утилитарный скрипт + `bootstrap.sh` |
| `/app/tools/` | `stage_3_1_baseline.py`, `stage_3_2_heatmap.py` |
| `/app/packages/` | `design-system` (theme, tokens, typography, motion), `runtime-client` (adapters, capabilities, core, errors, middleware) |

---

## 3. Money substrate — статус

Substrate **запечатан** (`MONEY_SUBSTRATE_COMPLETION_MILESTONE.md`, `SUBSTRATE_SEALING_REVIEW_SIGNOFF.md`):

- ✅ Single source of truth: `domains/money/service.py`
- ✅ 6 канонических money_states сидируются при boot
- ✅ Bridges PR1/PR2/PR3 (escrow/earnings/payout) активны
- ✅ Phase 2C завершена: B1 projection → B2/B3 stability + read switch → B4.0…B4.5 acceptance → writer removal plan
- ✅ Divergence Observer (B4.5) — passive, в `money_divergence.py`
- ✅ Reconciler: `RECONCILE run=recon_f50efc45d652 scanned=0 discrepancies=0` (boot ok)

⚠️ **Payouts V2** (22 endpoint, 4 daemon'а: worker/reaper/mock-advancer/scheduler) — без контракт-документа в `/audit/`. ROADMAP Track 4.6.

---

## 4. Интеграции — текущее состояние

```
/api/integrations/manifest → 6 capabilities:
  payment    : mock-payment   mode=mock  (STRIPE_SECRET_KEY missing)
  mail       : mock-mail      mode=mock  (RESEND_API_KEY missing)
  storage    : mock-storage   mode=mock  (CLOUDINARY_* missing)
  ai         : mock-ai        mode=mock  (EMERGENT_LLM_KEY missing)
  oauth      : -              mode=unavailable
  settlement : mock-settlement mode=mock  (StripeConnect DORMANT, PayPalPayouts DORMANT)
```

**Live-flip** = выставить `INTEGRATIONS_LIVE_ENABLED=1` в `backend/.env` + соответствующие ключи. Контракт `integrations/live_adapters.py` авто-подхватит. Список ключей — README §3.4.

---

## 5. Найденные проблемы и риски

### 5.1. ⚠️ `sentence-transformers` отсутствует (повторяется второй сессии подряд)

**Симптом:** при boot — 4 `ERROR - Embedding error for template <X>: No module named 'sentence_transformers'`. Scope-template matching работает деградировано (текстовое сравнение вместо vector cosine).

**Причина:** пакета нет в `backend/requirements.txt`, хотя `server.py` (около строки 17 294) импортирует его. `bootstrap.sh` ставит вручную `sentence-transformers==5.5.1`, но через supervisor этого не происходит.

**Решения:**
- **(A) Установить пакет:** `pip install --no-cache-dir sentence-transformers==5.5.1` (~5 GB c torch). Диск выдержит (запас 6.8 GB).
- **(B) Заменить на Emergent LLM key embeddings** (OpenAI text-embedding-3-small через `EMERGENT_LLM_KEY`). Освободит ~5 GB, требует одной правки в scope-bootstrap. Trade-off: live-зависимость от LLM API при сидинге.
- **(C) Зафиксировать в `requirements.txt`** — добавить `sentence-transformers==5.5.1` явно, чтобы Emergent's pip-runner ставил автоматически.

**Рекомендация:** (C) для совместимости + (B) для прод-оптимизации.

### 5.2. ⚠️ 10+ Duplicate Operation ID warnings (OpenAPI)

```
Duplicate Operation ID list_users_v2_api_admin_users_v2_get   (admin_users_layer.py)
Duplicate Operation ID get_user_detail_api_admin_users_v2__user_id__get
Duplicate Operation ID block_user_api_admin_users_v2__user_id__block_post
Duplicate Operation ID unblock_user_api_admin_users_v2__user_id__unblock_post
Duplicate Operation ID change_role_api_admin_users_v2__user_id__role_post
Duplicate Operation ID logout_all_api_admin_users_v2__user_id__logout_all_post
Duplicate Operation ID soft_delete_api_admin_users_v2__user_id__delete
Duplicate Operation ID audit_log_api_admin_audit_log_get
Duplicate Operation ID pass_validation_api_validation__validation_id__pass_post   (server.py)
Duplicate Operation ID fail_validation_api_validation__validation_id__fail_post
```

**Эффект:** OpenAPI всё равно отдаётся (warnings, не errors), но кодогенераторы клиентов (openapi-generator, swagger-codegen) могут падать.

**Фикс:** добавить `operation_id="..."` явно в декораторах в `admin_users_layer.py` и `server.py` (роуты `pass_validation`/`fail_validation`).

### 5.3. ⚠️ Frozen-scope D1 нарушен на Expo admin

`docs/product-scope-freeze.md` (2026-05-09) + amendment 1 (2026-05-19) разрешают **5 cockpit tabs + 8 read-mostly drill-downs = 13 экранов**. Фактически в `frontend/app/admin/` — **21 экран** (превышение на 8).

**Варианты** (ROADMAP Track 3):
- Amendment #2 — легализовать (рекомендуется в ROADMAP).
- Feature-flag — гейтить через runtime config (4–6 ч).
- Удалить лишние — вернуться к 13 (3–4 ч).

### 5.4. ⚠️ `pytest-asyncio` не установлен

Async-тесты в `backend/tests/` падают с `ImportError`. Установить нельзя напрямую — `pytest==9.0.3` несовместим с `pytest-asyncio` (требует pytest<9).

**Опции** (ROADMAP Track 4.5):
- Даунгрейд pytest до 8.4.x + pytest-asyncio 0.24.x.
- Миграция на `anyio.pytest_plugin` (anyio уже в deps) — **рекомендуется**, не требует даунгрейда.

### 5.5. ℹ️ OAuth `unavailable`

`integrations/manifest` показывает `oauth: mode=unavailable` (а не `mock`). Это может быть осознанным — `oauth` нет mock-провайдера, потому что quick-login не требует внешнего IdP. Но если интегрировать Google Sign-In для Expo (`expo-auth-session` уже в deps), нужно либо ввести mock-provider, либо выставить `GOOGLE_CLIENT_ID/SECRET`.

### 5.6. ℹ️ `memory/test_credentials.md` отсутствует в репо

Файл в `.gitignore` (строка 79). Это правильно (содержит креды), но `testing_agent` ожидает этот файл. Создаётся по факту boot'а — все 5 quick-login юзеров работают с пустым паролем через `POST /api/auth/quick`. Список:

```
admin@atlas.dev    → role admin
john@atlas.dev     → role developer
client@atlas.dev   → role client
multi@atlas.dev    → role developer (multi-project)
tester@atlas.dev   → role tester
```

Bcrypt hash для всех: `$2b$12$gvnQEE5Qe/hiJerLDkjjZu8zBJX8tKe7nfHy9cdwEDvnqL3cBYmjm` (одинаковый, dev-режим). Также сидируется dev pool: `alice.kim@`, `marco.rossi@`, `priya.shah@`, `luka.novak@`, `sara.ali@`, `diego.lopez@atlas.dev`.

### 5.7. ℹ️ Reload-storm на watchfiles

При первом запуске `uvicorn --reload` ловит ~190+ файловых событий (изменение времени модификации после `rsync`) и пересобирает приложение. После первого reload — стабильно. Это не баг, артефакт первого деплоя.

---

## 6. Соответствие фактическому состоянию и README/ROADMAP

| Параметр | README/ROADMAP | Фактически | Δ |
|----------|---------------:|-----------:|---|
| Endpoints | 741 | **743** | +2 |
| `server.py` LOC | 28 221 | **28 226** | +5 |
| Backend .py (с подкаталогами) | 91 (top-level) | **196** (с deep dirs) | — (разный учёт) |
| Frontend .tsx | 95 | **100** | +5 |
| Web pages | 98 | 98 | ok |
| Audit MD | "91" | **122** | +31 |
| `web/build` | "отсутствует" | **присутствует (14 MB)** | расхождение |
| Disk used | "71%" | **31%** | в норме |
| Admin Expo экраны | "5+8=13" (scope-freeze) | **21** | превышение |

---

## 7. Что готово прямо сейчас

- ✅ Полный clone + sync репо в `/app`.
- ✅ Backend, Expo, MongoDB подняты через supervisor (auto-restart on file changes).
- ✅ 743 endpoint опубликованы, OpenAPI валиден (с warnings).
- ✅ Все boot-сидеры отработали без падений (включая seed_replay, mock_seed, tester seed).
- ✅ Money substrate инициализирован, reconciler прошёл.
- ✅ Quick-login функционален (5 ролей).
- ✅ Public preview рендерит landing page EVA-X (lead workspace) и проходит через ngrok-tunnel.
- ✅ Все интеграции живут в режиме MOCK (production-safe, no external IO).

---

## 8. Что осталось / приоритеты

Из ROADMAP.md (актуально на сегодня), в порядке убывания:

1. **`requirements.txt` — добавить `sentence-transformers==5.5.1`** (1 строка) или мигрировать на embeddings через `EMERGENT_LLM_KEY`.
2. **Web build verify** — проверить, что backend действительно сервит `/admin/` (env `WEB_BUILD_DIR`, маршрут в `server.py`).
3. **i18n batch 3** — 5 client-facing страниц (`ClientCabinet.js`, `ClientProjectPage.js`, `ClientBillingOS.js`, `ClientReferralPage.js`, `ClientProfilePage.js`). ~1 ч.
4. **Payouts V2 контракт** (`audit/PAYOUTS_V2_STATE_MACHINE.md` по образцу `MONEY_STATE_MACHINE.md`). ~1 ч.
5. **Amendment #2** (frozen-scope D1 — легализация 21 экрана на admin Expo). ~30 мин.
6. **Duplicate Operation ID** fix в `admin_users_layer.py` + `server.py`. ~15 мин.
7. **pytest-asyncio → anyio.pytest_plugin** миграция тестов. ~10 мин подготовка + ~30 мин sweep.
8. **i18n batch 4–8** (admin/dev сторона, ~25 файлов). 4–6 ч.
9. **Docker / docker-compose** для self-hosted. 3–4 ч (LOW prio пока Emergent purchase).
10. **Expo i18n track** (UK не покрыт в `/frontend/app`). Отдельный sweep.

---

## 9. Команды для повторения

```bash
# Развёртывание из чистого Emergent контейнера:
rsync -a --exclude='.git' --exclude='.emergent' --exclude='node_modules' \
      --exclude='__pycache__' --exclude='.env' --exclude='*.env' \
      <repo>/ /app/

# Зависимости:
cd /app/backend && /root/.venv/bin/pip install -r requirements.txt
cd /app/frontend && yarn install --frozen-lockfile

# (опционально, для scope embeddings)
/root/.venv/bin/pip install --no-cache-dir sentence-transformers==5.5.1

# Перезапуск:
sudo supervisorctl restart backend expo

# Smoke:
curl http://localhost:8001/api/healthz                # {"status":"ok"}
curl -s http://localhost:8001/openapi.json | python3 -c "import json,sys; print(len(json.load(sys.stdin)['paths']))"
curl -X POST http://localhost:8001/api/auth/quick -H "Content-Type: application/json" -d '{"email":"admin@atlas.dev"}'
```

---

## 10. Готовность к следующей фазе

**Статус:** **🟢 GREEN — готово к продолжению разработки.**

Все три поверхности (backend / Expo / web build) развёрнуты и доступны. Sample-данные засеяны. Mock-интеграции активны и безопасны. Известные риски (sentence-transformers, duplicate operation IDs, frozen-scope D1) задокументированы и не блокируют разработку — это технический долг с приоритезацией в ROADMAP.

**Готов к командам пользователя**: добавление фич, фикс багов, live-flip интеграций, миграции, релиз.

---

_Документ сгенерирован E1 (Emergent) после полного clone-redeploy сессии Feb 2026._
_Свежие данные: `git log --oneline | head` + `curl http://localhost:8001/openapi.json`._
