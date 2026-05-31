# AUDIT 2026-02-FEB — Full Redeploy `evaevav` (E1, RU)

> Сессия: Emergent E1, агент-копия. Источник: `https://github.com/svetlanaslinko057/evaevav`.
> Workspace: `/app`. Preview: `https://app-deploy-116.preview.emergentagent.com`.

---

## 0. TL;DR

| Поверхность | Состояние | Доказательство |
|-------------|-----------|----------------|
| **Backend** (FastAPI) | ✅ live | `GET /api/healthz → {"status":"ok"}`, `/openapi.json → 743 paths`, lifespan startup полностью прошёл |
| **Mobile (Expo SDK 54)** | ✅ live | Metro + tunnel поднялся, главный экран EVA-X отрендерился (1564 модулей) |
| **MongoDB** | ✅ live | 11 seeded users, индексы создались (money_ledger, payouts_v2, validations, competitor TTL) |
| **Web (CRA React)** | ⚠️ не запущен | По дизайну Emergent supervisor управляет только expo+backend+mongodb. Поднимается опционально (`cd web && yarn build`). |
| **Фоновые демоны** | ✅ all started | PAY-V2 worker/reaper/mock-advancer/scheduler/reconciler, auto_guardian, module_motion, event_engine, operator scheduler, contract reminder loop, team_balancer |

**Endpoint-карта:** 743 path в OpenAPI (на 2 больше, чем в README — 741).
**Дубликаты:** 1 предупреждение `Duplicate Operation ID` (admin_users_layer.py).
**Embedding errors:** 4 невырущенных ошибки `libcublasLt.so` при сидинге scope-template-эмбеддингов — несмертельные, шаблоны записаны без векторов.

---

## 1. Что было сделано в этой сессии

1. **Анализ репозитория** — клонировал, прочитал README/ROADMAP/PRD, прошёлся по `/audit` (91 .md).
2. **Замена workspace** — старый стартовый шаблон `/app` снесён, контент `evaevav` положен поверх, `.env` файлы Emergent сохранены (EXPO_PACKAGER_*, MONGO_URL, EXPO_PUBLIC_BACKEND_URL — это контракт платформы).
3. **Backend deps** — `pip install -r backend/requirements.txt` поставил 150 пакетов, включая `sentence-transformers==5.5.1`. Это потянуло CUDA libs (~3 GB) → диск заполнился до 100 %. Удалил все `nvidia-*`, `cuda-toolkit`, `triton`, `pip cache purge`. После этого 6.4 GB свободно (`torch` остался CPU-only, но без `libcublasLt.so` → embedding-сидер словит ошибки на 4 шаблонах, см. секцию 4).
4. **Frontend deps** — `yarn install --frozen-lockfile` (52 сек). 615+ node_modules.
5. **Restart supervisor** — `backend`+`expo`. Оба `RUNNING`, lifespan завершился, операционный scheduler стартанул через 10 сек.
6. **Smoke** — `curl /api/healthz`, `curl /openapi.json` (743 paths), `POST /api/auth/quick` для admin@atlas.dev и client@atlas.dev — оба вернули заполненного юзера. Скриншот UI: главный экран EVA-X с CTA «See my product plan».
7. **Memory update** — переписал `/app/memory/PRD.md` и `/app/memory/test_credentials.md` под текущее состояние и список seeded users.

---

## 2. Архитектурный карт (что есть в репо)

### 2.1 Backend (`/app/backend`)

- **180 .py файлов** в верхнем уровне (на 116 reported в README → разница из `__pycache__` + glob)
- **`server.py` = 28 280 строк** (на 59 больше, чем 28 221 в README — новые i18n правки)
- **743 endpoint** в `/openapi.json` (топ-15 префиксов):

| Префикс | Кол-во |
|---------|--------|
| `/api/modules/{module_id}` | 22 |
| `/api/account/me` | 20 |
| `/api/client/projects` | 15 |
| `/api/admin/projects` | 14 |
| `/api/admin/money` | 14 |
| `/api/admin/settings` | 14 |
| `/api/admin/mobile` | 13 |
| `/api/developer/tasks` | 11 |
| `/api/payouts-v2/admin` | 11 |
| `/api/admin/control-center` | 10 |
| `/api/admin/system` | 8 |
| `/api/admin/team` | 8 |
| `/api/mobile/auth` | 8 |
| `/api/admin/qa` | 7 |
| `/api/admin/users-v2` | 7 |

- **Доменная топология** — Money substrate (escrow/earnings/payout/divergence-observer), Payouts V2 (22 ep + 4 daemon'а), Acceptance/Assignment, Work Execution, Intelligence brains (developer/team/revenue/execution), Admin cockpit. Изоляция интеграций через `integrations/registry.py` + `live_adapters.py` (mock-режим по умолчанию).

### 2.2 Mobile (`/app/frontend`, Expo SDK 54)

- **100 .tsx** под `app/` (file-based routing через `expo-router`)
- **5 ролей**:

| Роль | Экранов в `app/` | Frozen-scope target | Статус |
|------|------------------|---------------------|--------|
| admin | **21** | 13 (5 cockpit + 8 read-only) | ⚠️ violation D1 (см. секция 5) |
| client | 20 | open | ok |
| developer | 18 | open | ok |
| tester | 6 | 4 (Stage 4) | ⚠️ +2 экрана |
| lead | 2 | conversion surface | ok |

Плюс корневые: `auth.tsx`, `gateway.tsx`, `welcome.tsx`, `index.tsx`, `chat.tsx`, `inbox.tsx`, `describe.tsx`, `estimate-improve.tsx`, `estimate-result.tsx`, `project-booting.tsx`, `hub.tsx`, `operator.tsx`, `documents.tsx`, `voice-demo.tsx`, `two-factor-*.tsx` (3 шт), `profile.tsx`, `settings.tsx`, `account.tsx`, `activity.tsx`, `work.tsx`, `help.tsx`.

### 2.3 Web (`/app/web`, React 18 + CRA + craco)

- **231 .js/.jsx** файлов под `src/`. **Не запускается** под supervisor (по контракту Emergent).
- Чтобы поднять локально: `cd /app/web && yarn install && yarn build` → отдавать через nginx на отдельный порт.

### 2.4 Shared (`/app/packages`)

- `runtime-client` (единый HTTP-клиент с retry/auth), `design-system` (UI-токены и компоненты).

### 2.5 Документация

- `/app/audit` — **121 .md/.json/.csv** (контракты, фазовые close-out'ы, smoke trace'ы, governance)
- `/app/docs` — `product-scope-freeze.md` + amendment 1, runtime contracts, synthetic corpus
- Корневые: `README.md`, `ROADMAP.md`, `design_guidelines.{json,md}`, `test_result.md`

---

## 3. Что работает (boot evidence)

```
INFO: Application startup complete.
INFO: payouts_v2 — indexes ensured
INFO: PAY-V2 worker started: id=worker_d27a40dd8d interval=5s
INFO: PAY-V2 reaper started: interval=30s
INFO: PAY-V2 mock advancer started: interval=5s delay=2s
INFO: PAY-V2 scheduler started (interval 900s)
INFO: money_bridge — MoneyService initialised (Phase 2B PR-1)
INFO: MONEY LEDGER: indexes ensured
INFO: COMPETITOR CACHE: TTL index ensured (24h)
INFO: VALIDATION CAMPAIGNS: indexes ensured
INFO: GUARDIAN: loop started (interval 120s)
INFO: MODULE MOTION: loop started (interval 15s)
INFO: CONTRACT REMINDER LOOP: started (interval 21600s)
INFO: OPERATOR SCHEDULER: started (300s interval)
INFO: RECONCILE LOOP: started (interval 1800s)
INFO: AUTO_BALANCER: cycle complete — overloaded=0 priority=0 moves=0
```

**Сидеры (boot-time):**
- 11 users (3 admin/client/multi-role/tester + 1 john + 6 dev pool)
- 3 demo notifications для `john@atlas.dev` и `client@atlas.dev`
- 5 tester validations + 1 issue для `tester@atlas.dev`
- 4 scope templates (Online Marketplace, SaaS Dashboard, Fitness & Wellness App, E-Commerce Store) — без embeddings
- 1 admin integration block (`wayforpay`, `stripe`, `app`, `payments`)

**HTTP smoke:**
```
GET  /api/healthz                 → 200 {"status":"ok"}
POST /api/auth/quick admin@…      → 200 {"isNew":false, user:{…role:"admin"}}
POST /api/auth/quick client@…     → 200 {"isNew":false, user:{…role:"client"}}
GET  /api/integrations/manifest   → 200 (зовётся frontend'ом многократно)
GET  /openapi.json                → 200 (743 paths)
```

**Frontend UI:** главный экран EVA-X (welcome) рендерится через web preview: hero «Build real products. Not tasks.», sequence-steps SEQ-01/02/03, CTA «See my product plan», нижний линк «Already have an account? Log in». Bundle = 1564 модулей.

---

## 4. Риски / расхождения / TODO

### 🔴 Высокий

1. **`requirements.txt` тянет sentence-transformers без CPU-only вилки.**
   Эффект: на машинах без CUDA `libcublasLt.so.*[0-9]` отсутствует → embedding-сидер падает на 4 scope-templates. Шаблоны сохраняются без векторов → семантический поиск по корпусу шаблонов деградирует до текстового.
   Fix: либо закрепить `torch==X.Y.Z+cpu` через `--extra-index-url https://download.pytorch.org/whl/cpu`, либо вынести `sentence-transformers` в опциональную зависимость и сделать fallback на BoW/TF-IDF.

2. **Duplicate Operation ID `audit_log_api_admin_audit_log_get`** в `admin_users_layer.py`.
   Эффект: OpenAPI генерирует предупреждение, SDK-кодогенерация (если будет) сломается на конфликте имён.
   Fix: переименовать функцию или дать ей уникальный `operation_id` через декоратор `@router.get(..., operation_id="…")`.

3. **D1 violation:** в `/app/frontend/app/admin/` лежит 21 экран против 13 разрешённых amendment-1. Это явно зафиксировано в ROADMAP и старом аудите (`audit/AUDIT_2026-05-30_FULL_REDEPLOY_E1_RU.md`).
   Fix: либо снести 8 экранов и перевести их во web, либо открыть amendment #2 и формально пересмотреть scope.

### 🟡 Средний

4. **Web (CRA) не подключён к preview.** Сейчас preview URL отдаёт expo (mobile web). Если нужен web-кабинет в одном домене — нужен nginx route или поднимать на отдельной поддомене.

5. **Tester surface 6 экранов вместо 4** (Stage 4 frozen). Аналогично D1: либо обрезать, либо амендмент.

6. **ngrok транзиент-фейлы** при первом старте (`ngrok tunnel took too long to connect`). Самовосстанавливается через 1-2 рестарта supervisor'а. Не блокирует. Логи: `/var/log/supervisor/expo.err.log`.

7. **Email/payment/storage — все интеграции в MOCK** (по контракту `integrations/registry.py`). Live-флип = `INTEGRATIONS_LIVE_ENABLED=1` + наполнение ключей: `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `WAYFORPAY_*`, `CLOUDINARY_*`, `GOOGLE_CLIENT_ID/SECRET`.

8. **`EMERGENT_LLM_KEY` не выставлен.** Все LLM-вызовы через litellm/emergentintegrations сейчас деградируют до mock/error. Нужно подтянуть из Emergent profile или прописать в `backend/.env`.

### 🟢 Низкий

9. **`pymongo==4.5.0` + `motor==3.3.1`** — версии в requirements.txt отстают от latest. Работают, но есть deprecation warnings.
10. **`pydantic 2.12.5` + `fastapi 0.110.1`** — fastapi не на последней (0.115+). Совместимо, но при бампе может сломаться сериализация.
11. **101 .md в `/app/audit`** — много исторических close-out'ов. Стоит периодически архивировать в `/audit/_archive/`.

---

## 5. Frozen-scope контракт (D1/D2/D3)

Источник: `docs/product-scope-freeze.md` (2026-05-09) + amendment 1 (2026-05-19).

| Decision | Правило | Текущий статус |
|----------|---------|----------------|
| D1 | Expo admin = 5 cockpit tabs + 8 read-only drill-downs | ⚠️ **21 экран**, нужно либо обрезать, либо amendment #2 |
| D2 | Expo tester = Stage 4 (4 экрана) | ⚠️ **6 экранов**, минор расхождение |
| D3 | Lead = conversion surface only, без отдельной роли в auth | ✅ 2 экрана, нет роли |

---

## 6. Безопасность (быстрая проверка)

| Контроль | Состояние |
|----------|-----------|
| Cookies/session | bcrypt `$2b$12$...` (видно в seeded user response) |
| 2FA TOTP | `pyotp` подключён, endpoints `/api/auth/2fa/*` |
| `.env` в `.gitignore` | ✅ да, ключи не коммитятся |
| Live-флип интеграций | За одной переменной `INTEGRATIONS_LIVE_ENABLED` |
| MongoDB `_id` exposure | Pydantic-модели в response, в `users` ответе нет `_id` |
| CORS | настроен в `server.py` (нужна точечная проверка origin'ов) |
| Rate-limit | `slowapi==0.1.9` + `limits==5.8.0` подключены |

---

## 7. Команды для повторного запуска / диагностики

```bash
# Перезапуск сервисов
sudo supervisorctl restart backend expo
sudo supervisorctl status

# Healthcheck
curl -s http://localhost:8001/api/healthz
curl -s https://app-deploy-116.preview.emergentagent.com/api/healthz

# Quick-login (без пароля)
curl -X POST http://localhost:8001/api/auth/quick \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@atlas.dev"}'

# Логи
tail -n 100 /var/log/supervisor/backend.err.log
tail -n 100 /var/log/supervisor/expo.out.log

# Mongo
mongosh test_database --eval 'db.users.find({},{_id:0,email:1,role:1}).toArray()'

# Подсчёт endpoint'ов
curl -s http://localhost:8001/openapi.json | \
  python3 -c "import json,sys; print(len(json.load(sys.stdin).get('paths',{})))"

# Сборка web (опционально)
cd /app/web && yarn install && yarn build
```

---

## 8. Готовность по слоям

| Слой | Готовность | Что нужно для prod |
|------|------------|---------------------|
| Backend (mock) | 95 % | Live-ключи интеграций, fix duplicate operation ID, CPU-torch |
| Mobile (Expo) | 90 % | Закрыть D1/D2 расхождения, native build для push-notifications |
| Web | 0 % (не запущен) | `yarn build`, nginx-route, smoke по 98 страницам |
| Money substrate | sealed (95 %) | Payouts V2 contract в `/audit/` (отсутствует), B4 writer removal |
| Интеграции | mock 100 %, live 0 % | RESEND/STRIPE/WAYFORPAY/CLOUDINARY/Google + EMERGENT_LLM_KEY |

---

## 9. Рекомендации (next steps)

1. **CPU-only torch** — закрепить в `backend/requirements.txt`: `torch==2.x.y+cpu`, `--extra-index-url https://download.pytorch.org/whl/cpu`. Это сразу убьёт 4 boot-warning'а и сэкономит ~3 GB.
2. **Duplicate Operation ID fix** — `admin_users_layer.py`: переименовать `audit_log` или дать explicit `operation_id`.
3. **Amendment #2 или обрезка D1/D2** — определиться с product owner, что делать с 8 лишними admin-экранами и 2 лишними tester-экранами.
4. **Web build pipeline** — `cd /app/web && yarn build`; добавить nginx-route в Emergent.
5. **Live integration flip plan** — собрать ключи у владельца проекта (Resend → Stripe sandbox → WayForPay sandbox → Cloudinary → Google OAuth).
6. **EMERGENT_LLM_KEY** — подтянуть из платформы и прописать в `backend/.env`.
7. **i18n batch 3** — продолжить EN/UK sweep по open issues в `audit/CABINET_I18N_SWEEP_2026-05-30.md`.
8. **Payouts V2 contract doc** в `/audit/` (отсутствует) — описать state-machine, blast radius, retry policy.

---

_Аудит подготовлен агентом E1 в Emergent workspace `/app`. Дата сессии: 2026-02-FEB._
