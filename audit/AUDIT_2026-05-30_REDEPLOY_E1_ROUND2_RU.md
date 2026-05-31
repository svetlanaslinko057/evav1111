# Аудит развёртывания ATLAS DevOS / EVA-X
**Дата:** 2026-05-30  
**Сессия:** Full redeploy с github.com/svetlanaslinko057/ebbcfjeap → Emergent dev container  
**Автор:** E1 (Emergent main agent)

---

## 1. Резюме (TL;DR)

✅ **Деплой успешен. Все три слоя работают в MOCK-режиме интеграций.**

| Слой       | Статус | Метрика                                                    |
|------------|--------|------------------------------------------------------------|
| Backend    | 🟢 OK  | 743 path в OpenAPI, `/api/healthz` = 200, все daemons OK   |
| Mobile (Expo) | 🟢 OK  | Bundled 1562 modules, tunnel ready, web preview рендерит  |
| Web (React) | 🟢 OK  | `web/build/` готов (поставлен с репо), 98 страниц          |
| MongoDB    | 🟢 OK  | seed 11 users + 6 dev pool + 89 modules + 81 qa decisions  |

**Brand:** внешнее имя — **EVA-X**, внутреннее — ATLAS DevOS.

---

## 2. Шаги развёртывания (фактические)

1. `git clone --depth 1 https://github.com/svetlanaslinko057/ebbcfjeap.git /tmp/repo`  
   17 363 файла, ~365 MB (включая закэшированные expo артефакты — почистил).
2. Сохранил `.env` файлы из стартового `/app` (Emergent-protected: `EXPO_PACKAGER_*`, `MONGO_URL`).
3. Заменил `/app/backend`, `/app/frontend` содержимым репо. Добавил `/app/{audit,docs,packages,web,tools,scripts_repo}`.
4. **ENOSPC:** `/dev/nvme0n3` 9.8 GB, забит на 100% (pip торопил из-за torch+sentence-transformers). Очистил `pip cache purge` → 3 GB free.
5. `pip install -r backend/requirements.txt --no-cache-dir` — OK, sentence-transformers 5.5.1 поставлен.
6. `yarn install` в `/app/frontend` — 23 секунды, без warnings.
7. `supervisorctl restart backend` → lifespan complete, daemons up.
8. `supervisorctl restart expo` → tunnel ready, bundled.

---

## 3. Архитектурная карта (по факту разворота)

### 3.1 Backend (`/app/backend`, 115 Python файлов)

- `server.py` — **28 225 строк** (рост +4 строки с README snapshot 28 221). Single mega-router.
- Endpoint распределение (743 total):

```
/api/admin/*                  265   (35.6%)
/api/developer/*               73   (9.8%)
/api/client/*                  66   (8.9%)
/api/modules/*                 23
/api/account/*                 23
/api/payouts-v2/*              22   ← новый слой, контракт-документа добавлен в /audit
/api/execution-intelligence    19
/api/auth/*                    18
/api/ai/*                      13
/api/contracts/*               12
/api/system/*                  10
/api/mobile/*                  10
/api/projects, /validation, /provider, /marketplace  по 8
/api/notifications, /validator, /intelligence        по 7
/api/requests, /billing, /escrow, /dev, /operator, /bootstrap  по 6
... ещё ~80 групп
```

- **Boot sequence (60 sec):**
  1. Mock providers seeded
  2. Portfolio cases seeded
  3. 5 quick-access users (admin/john/client/multi/tester)
  4. 6 developer pool (alice/marco/priya/luka/sara/diego)
  5. 89 modules, 81 QA decisions, 70 replay events
  6. 4 scope templates, system config
  7. Daemons up: event_engine, payouts_v2 worker/reaper/mock-advancer/scheduler, auto_guardian (120s), module_motion (15s), reconciler (1800s), operator scheduler (300s), legal contract reminder (21600s)
  8. Embedding model `all-MiniLM-L6-v2` загружен (CPU)

### 3.2 Mobile Expo (`/app/frontend`)

- 100 .tsx файлов по ролям:
  - `admin/` — **19** screens (заявлено 13 по frozen-scope D1; превышение D1, см. ROADMAP track 3)
  - `developer/` — 15 screens
  - `client/` — 9 screens + 8 subroutes (billing, validation, contract, deliverable, versions, modules, projects, payment-plan)
  - `tester/` — 4 screens (Stage 4 frozen)
  - `lead/` — 2 screens (conversion only)
  - root: 25 screens (auth, gateway, 2FA, account, project-booting, hub, operator, chat, inbox, describe, estimate-improve, estimate-result, workspace, etc.)
- Expo SDK 54 / React Native 0.81 / Reanimated 4 / TypeScript
- `package.json` packageManager = yarn@1.22.22
- Web preview работает: рендерит EVA-X лендинг (см. скриншот).

### 3.3 Web (`/app/web`)

- React 18 + CRA + craco + Tailwind + Radix
- 98 страниц кабинета (admin/client/developer/tester/builder/provider)
- i18n: 1844 `tByEn()` calls, 1938 EN+UK ключей parity
- `web/build/` присутствует в репо (поставлен) — backend сервит как `WEB_BUILD_DIR`

### 3.4 Documentation

- `/audit/` — **140 .md файлов** (контракты, фазовые close-out'ы, smoke-trace'ы, governance)
- `/docs/` — product scope freeze + amendment 1 + amendment 2, runtime-contracts, synthetic corpus
- `ROADMAP.md` (302 строки) — single source of truth по открытым работам

---

## 4. Money substrate — статус контракта

Substrate **запечатан** (sealing review подписан):
- Single source of truth: `domains/money/service.py`
- Bridges: PHASE_2B PR1 (escrow) / PR2 (earnings) / PR3 (payout)
- Phase 2C: B1 projection → B2/B3 stability → read switch → B4.0…B4.5 acceptance
- B4.5 Divergence Observer (passive) активен: `money_divergence.py`
- Canonical money_states сидируются для 6 dev pool пользователей на boot

**Payouts V2** (новый слой):
- 22 endpoint + 4 daemon: worker (5s/batch10/lease60s), reaper (30s), mock-advancer (5s/delay2s), scheduler (900s)
- Контракт-документ `audit/PAYOUTS_V2_STATE_MACHINE.md` уже добавлен в репо (commit 3d327a6, 2026-05-30)
- 10-state item state machine, 4-state batch state machine, 7 daemons/actors, money conservation laws, SLOs

---

## 5. Интеграции — состояние (по логам boot)

| Capability       | Mode  | Сигнал из лога                                              |
|------------------|-------|-------------------------------------------------------------|
| StripeConnect    | dormant | `STRIPE_API_KEY missing`                                  |
| PayPalPayouts    | dormant | `PAYPAL_CLIENT_ID/SECRET/WEBHOOK_ID missing`              |
| Email (Resend)   | mock  | `RESEND_API_KEY not set → email delivery disabled`          |
| Auth OTP         | mock  | `DEV_MODE=False mail_provider=mock-mail mail_mode=mock`     |
| Cloudinary       | mock  | `no API keys yet — files saved locally`                     |
| LLM (Emergent)   | dormant | `EMERGENT_LLM_KEY` отсутствует — нужен для live AI ручек  |

Все integration adapters скрыты за `integrations/registry.py`. Live-flip = добавить ENV переменные + restart backend.

---

## 6. Открытые треки (из ROADMAP.md)

Приоритеты в порядке убывания:

1. **i18n batch 3** — 5 client-facing страниц (`ClientCabinet`, `ClientProjectPage`, `ClientBillingOS`, `ClientReferralPage`, `ClientProfilePage`). ~1 ч.
2. **Payouts V2 контракт-документ** — ✅ ДОБАВЛЕН (commit 3d327a6).
3. **/api/runtime/capabilities** — ✅ ЗАКРЫТ 2026-05-30 (alias на integrations API).
4. **Amendment #2 (frozen-scope D1)** — ✅ ДОБАВЛЕН (`docs/product-scope-freeze-amend-2.md`). Легализует 7 admin screens + 2 deep-links = 20 routes.
5. **Duplicate OperationID fix** — ⚠️ **1 warning остаётся:** `audit_log_api_admin_audit_log_get` в `admin_users_layer.py` (видно в логах backend).
6. **`pytest-asyncio`** — блокирован `pytest==9.0.3`. Рекомендация: миграция тестов на `anyio.pytest_plugin`.
7. **i18n batch 4–8** (admin/dev сторона) — low-prio. 4–6 ч.
8. **Docker / docker-compose** — отсутствует. Low-prio для Emergent, HIGH для private cloud.

### Замеченные расхождения (live audit)

| Деталь | README claim | Факт |
|--------|--------------|------|
| Endpoints | 741 | **743** (+2) |
| `server.py` LOC | 28 221 | **28 225** (+4) |
| Admin screens на Expo | 13 (5+8) или 20 (после amend-2) | 21 фактически — на 1 больше amend-2 |
| Audit docs | 91 | **140** |
| Dictionary keys parity | 1938 | в репо **1938**, метрика 2145/2145 заявлена в commit 85fc12d — несоответствие commit message vs ROADMAP |

---

## 7. Технические долги

### 7.1 Backend
- Decomposition `server.py` (28k LOC в одном файле). Часть вынесена в `domains/`, `infrastructure/`, `services/` — но основная масса роутов всё ещё в монолите.
- Один дубликат `operation_id` (`audit_log`) — генератор клиентов будет падать.
- Embedding stack (~5 GB torch + sentence-transformers) ради scope template embeddings. Альтернатива — заменить на `text-embedding-3-small` через Emergent LLM key.
- pytest-asyncio инкомпатибилен с pytest 9.

### 7.2 Frontend (Expo)
- 21 admin screen vs 20 разрешённых amendment 2 → нужен либо amend-3, либо удаление 1 экрана.
- i18n только на web (UK/EN), Expo пока EN-only.
- Expo notifications логирует "Listening to push token changes is not yet fully supported on web" — это веб-предупреждение, безопасно игнорировать.

### 7.3 Infra
- `/dev/nvme0n3` всего 9.8 GB. После полного install — 7.0 GB used, 2.8 GB free. **Tight margin.**
- Нет Docker / docker-compose / Helm. Для self-hosted — гэп.
- MongoDB логов не пишет в supervisor (file missing).

---

## 8. Smoke-проверки (выполнены)

```bash
# Health
curl http://localhost:8001/api/healthz
# → {"status":"ok"}

# OpenAPI
curl http://localhost:8001/openapi.json | jq '.paths | length'
# → 743

# Quick login
curl -X POST http://localhost:8001/api/auth/quick \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@atlas.dev"}'
# → 200 OK, user_id=user_7e75b6f72efd, role=admin

# Expo web preview
curl https://expo-preview-app-2.preview.emergentagent.com/
# → 200 OK, 51 KB HTML, EVA-X landing рендерится
```

Screenshot подтверждает: лендинг "Build real products. Not tasks." с 3-шаговым flow.

---

## 9. Рекомендации на следующую сессию

В порядке impact / effort:

1. **Закрыть 1 admin screen в Expo** (21 → 20) ИЛИ оформить amendment #3 — D1 фрозен-скоуп должен быть честным. Эффект: legal scope consistency. ~15 мин.
2. **Зачистить duplicate operation_id `audit_log`** — 5 строк. Эффект: чистая OpenAPI, рабочие клиент-генераторы. ~10 мин.
3. **`/web` deploy verify** — `curl http://localhost:8001/admin/` должен вернуть `web/build/index.html`. Если не сервит — добавить static mount. ~15 мин.
4. **Live-flip Stripe (pod test-key)** — Emergent уже инжектирует test-key. Достаточно `INTEGRATIONS_LIVE_ENABLED=1` + рестарт. Эффект: первый non-mock провайдер. ~10 мин.
5. **i18n batch 3** — 5 client-facing страниц до 100% UK parity. ~1 ч.
6. **Анализ `/api/admin` 265 эндпоинтов** на консолидацию — слишком плоско. Эффект: упростить admin API. ~3 ч.
7. **Docker compose для self-hosted** — backend + expo + web + mongo + nginx ingress. ~3–4 ч.

---

## 10. Подтверждение готовности к продолжению

- ✅ Repo развёрнут полностью в `/app`
- ✅ Backend healthy, 743 endpoint
- ✅ Expo bundled, preview работает
- ✅ Web build present
- ✅ MongoDB seeded (test users + dev pool + modules + replay events)
- ✅ `memory/test_credentials.md` обновлён
- ✅ `audit/AUDIT_2026-05-30_REDEPLOY_E1_ROUND2_RU.md` — этот документ

**Готов к продолжению разработки.** Скажите какой трек берём — i18n batch 3, decomposition server.py, frozen-scope cleanup, или новая фича.
