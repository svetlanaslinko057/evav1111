# ATLAS DevOS / EVA-X — Roadmap

> Single source of truth по текущим открытым работам. Обновляется по факту
> закрытия каждого трека. Точки актуальности — `audit/AUDIT_2026-05-30_*.md`.

---

## Track 1 · Cabinet i18n EN→UK sweep

### Контекст

Скрипт `scripts/cabinet-i18n-coverage.py` собирает 98 cabinet-страниц
(`/web/src/pages/`) и эвристически детектит **probable hardcoded EN JSX text
nodes** — текст внутри `>...<` без обёртки `tByEn(...)`. Эвристика:
4–80 символов, минимум одна lowercase, не all-caps tech-label, не комментарий.

`tByEn` из `LanguageContext` резолвится через **reverse-index** по EN-литералу
из `web/src/i18n/dictionary.js`. То есть достаточно (а) обернуть JSX-текст
в `{tByEn('...')}` и (б) добавить ключ в `dictionary.js` с EN+UK переводом —
для всех вхождений того же литерала.

### Метрики (snapshot 2026-05-30)

| Метрика | Стартовое значение | После batch 2 | Δ |
|---------|-------------------:|--------------:|--:|
| Total `tByEn(...)` calls | 1514 | **1585** | +71 |
| Total hardcoded EN ≈ | 317 | **253** | −64 |
| Dictionary EN keys | 1884 | **1938** | +54 |
| Dictionary UK keys (parity) | 1884 | **1938** | +54 |

### Закрыто в этой сессии

**Batch 1** (5 файлов, hardcoded≈7 каждый → 0):
- `TwoFactorRecoveryPage.js`
- `GPTScopeBuilder.js`
- `AdminPricingConfigPanel.js`
- `ClientAuthPage.js`
- `ClientDeliverablePage.js`

**Batch 2** (3 файла, hardcoded≈15/7/7 → 0):
- `AdminExecutionIntelligence.js`
- `NewRequest.js`
- `PortfolioCaseDetail.js`

Подробности: `audit/CABINET_I18N_SWEEP_2026-05-30.md`.

### Что осталось — 30 файлов с hardcoded≥2

Top-15 кандидатов (по убыванию hardcoded≈):

| # | Файл | tByEn | Hardcoded≈ | Lines |
|---|------|------:|----------:|-----:|
| 1 | `AdminIntegrationsPage.js` | 43 | 6 | 678 |
| 2 | `ScopeBuilder.js` | 32 | 6 | 690 |
| 3 | `ContractSignEvidencePage.js` | 23 | 6 | 428 |
| 4 | `AdminPayoutBatchDetail.js` | 21 | 6 | 418 |
| 5 | `DeveloperDashboard.js` | 19 | 6 | 360 |
| 6 | `ClientEstimatePage.js` | 14 | 6 | 317 |
| 7 | `AdminLoginPage.js` | 8 | 6 | 387 |
| 8 | `AdminEarningsControl.js` | 4 | 6 | 371 |
| 9 | `AdminPressureTopology.js` | 2 | 6 | 405 |
| 10 | `AdminReconciliation.js` | 52 | 5 | 688 |
| 11 | `AdminTeamPanel.js` | 39 | 5 | 359 |
| 12 | `DeveloperGrowthPage.js` | 37 | 5 | 566 |
| 13 | `AdminDeveloperProfile.js` | 27 | 5 | 412 |
| 14 | `AdminDeliverableBuilder.js` | 18 | 5 | 489 |
| 15 | `DeveloperWorkPage.js` | 18 | 5 | 525 |

Полная карта — `audit/CABINET_I18N_COVERAGE_2026-05-30.md` (регенерируется
скриптом `python3 scripts/cabinet-i18n-coverage.py`).

### Пайплайн закрытия одного файла (≈10 минут)

1. Прогон `cabinet-i18n-coverage.py` → актуальный список JSX-литералов для файла.
2. Python regex-замена `>TEXT<` → `>{tByEn('TEXT')}<` (атомарно по списку строк).
3. Ручная правка mixed-content фрагментов (`<code>`, `<strong>`, `<br/>`).
4. Добавление новых ключей в `dictionary.js` (EN+UK parity) под префиксом
   домена страницы (`cab.scope.*`, `cab.admin.*`, `cab.dev.*` и т.д.).
5. Babel parse-check (`@babel/parser` уже в node_modules linter'ов).
6. Повторный прогон скрипта → подтверждение `hardcoded≈0` для файла.

### Решение о продолжении

**Нужно ли продолжать i18n sweep?**

| Сценарий | Когда применить |
|----------|------------------|
| **Прогнать все 30 файлов** (15–20 ч работы) | Если UK-локаль — production-приоритет. Покрытие хотят 100% перед маркетинговым запуском в UA. |
| **Остановиться на batch 2** | Если 5 ключевых auth/scope/pricing страниц + 3 топ-офендера — достаточный объём, а остальное — низкочастотная админка/dev-поверхность. Текущее покрытие = **80% уникальных вхождений** (`1585 / (1585+253)`). |
| **Гибрид** | Закрыть еще ~12 client-facing страниц (ClientEstimate, ClientDelivery, ClientAuth уже закрыты, остаются ClientCabinet/Project/Billing/Support/Versions/Profile/Documents/Contract/Operator/Costs/Transparency/Referral). Админка и dev — в low-prio. |

**Рекомендация:** **гибрид**. Client-poверхность видит конечный пользователь
(украиноязычный лид/клиент). Admin/dev-кабинеты — внутренний инструмент,
команда обычно EN-комфортная. Это ≈ ещё 4–6 батчей.

### Что НЕ автоматизируется

- **Inline-mixed content** (`Text <code>x</code> more text`) — нужны ручные сегменты.
- **`title=` / `placeholder=` / `aria-label=`** — текущая эвристика их не ловит
  (она ищет только `>TEXT<`). Если хочется покрыть — нужен отдельный sweep.
- **Template literals** (`` `Hello ${name}` `` в JSX) — heuristic пропускает,
  требуется AST-walker.
- **Динамический i18n** (e.g. `t(\`status.${status}\`)`) — уже работает корректно
  для ключей с префиксом `status.*` в словаре.

### Известные ограничения

1. `tByEn` работает **только в web-кабинете** (`/web/src/pages`). Expo-приложение
   (`/frontend/app`) пока на EN — отдельный трек.
2. Reverse-index в `LanguageContext.js` строится один раз при загрузке модуля.
   При hot-reload словаря (dev) нужно полностью обновить страницу.
3. Скрипт coverage даёт SIGNAL, не GROUND TRUTH. Возможны false positives
   (props, JSX-выражения, выглядящие как текст) и false negatives
   (template literals).

---

## Track 2 · Web build & deploy

### Состояние
- `/web/build/` **отсутствует**. Backend сервит `WEB_BUILD_DIR`, который пуст —
  веб-админка недоступна.
- `/web/package.json` готов (CRA + craco + Tailwind + Radix).

### Действия
1. `cd web && yarn install --network-timeout 600000`
2. `yarn build` → `web/build/` (~30–60 с, ~1.5 GB free disk).
3. Verify: `curl http://localhost:8001/admin/` → должен вернуть `index.html`
   из `web/build/`.

Включено в `scripts/bootstrap.sh --with-web`.

---

## Track 3 · Frozen-scope D1 (amendment #2)

### Контекст
`docs/product-scope-freeze.md` (2026-05-09) + amendment 1 (2026-05-19)
разрешали 5 cockpit tabs + 8 read-mostly drill-downs на Expo admin.

**Фактически в `/frontend/app/admin/` сейчас 21 экран** (превышение на 8).

### Варианты решения

| Опция | Стоимость | Эффект |
|-------|-----------|--------|
| **Amendment #2** — легализовать 21 экран с операционным обоснованием | 1 ч | Frozen-scope обновлён, продолжаем как есть |
| **Feature-flag** — гейтить лишние экраны через runtime config | 4–6 ч | Cockpit чистый, экраны включаются по флагу |
| **Удалить лишние** — вернуться к 13 (5+8) | 3–4 ч | Минимальный admin scope, web покрывает full admin |

**Рекомендация:** Amendment #2 — оформить как написано в codе, и больше не
расширять без явного обоснования.

---

## Track 4 · Backend optimisation

### 4.1. server.py decomposition

- Текущее: **28 221 строк** в одном файле, +850 строк с прошлого аудита.
- План: продолжать вытаскивать роуты в `APIRouter`'ы согласно
  `audit/ARCHITECTURE_DECOMPOSITION_AUDIT_2026-05-19.md` и
  `PR0_ACCEPTANCE_REPORT_2026-05-14.md`.
- Прогресс: уже есть `domains/`, `infrastructure/`, `services/` — но основная
  масса роутов всё ещё в `server.py`.

### 4.2. Duplicate OperationID в OpenAPI

10+ warnings в логах:
```
Duplicate Operation ID list_users_v2_api_admin_users_v2_get
Duplicate Operation ID get_user_detail_api_admin_users_v2__user_id__get
...
```

Эффект: OpenAPI всё равно резолвится (warnings, не errors), но генераторы
клиентов могут падать.

**Фикс:** добавить `operation_id="..."` явно в декораторах роутов в
`admin_users_layer.py`, `server.py` (`pass_validation`, `fail_validation`).

### 4.3. /api/runtime/capabilities — ✅ ЗАКРЫТО (2026-05-30)

Endpoint реализован как тонкий alias в `backend/runtime_layer.py` поверх
existing `integrations_api.get_capability_matrix()` и `get_capability_manifest()`.
Wired в `server.py` сразу после `_integrations_api`. Доступно:

- `GET /api/runtime/capabilities` → 200 (mirrors `/api/integrations/capabilities`)
- `GET /api/runtime/manifest` → 200 (mirrors `/api/integrations/manifest`)

Verified curl-проверкой. Дополнительной бизнес-логики не добавлено — single
source of truth остаётся в `integrations/registry.py`.

### 4.4. ML-стек cleanup

- `sentence-transformers` (~5 GB c torch) — установлен в bootstrap, нужен
  для scope template embeddings.
- **Альтернатива:** заменить на лёгкие embedding'и через `EMERGENT_LLM_KEY`
  (OpenAI text-embedding-3-small ≈ 50 ms latency, без локального torch).
- Освобождение диска: **~5 GB**.
- Trade-off: live-зависимость от LLM API при сидинге scope templates.

### 4.5. pytest-asyncio

Не установлен → async-тесты падают на `ImportError`.

⚠️ **Блокер:** `pytest-asyncio` (любая версия) требует `pytest<9`, у нас же
`pytest==9.0.3`. Опции:
- (a) даунгрейд `pytest` до `8.4.x` + `pytest-asyncio==0.24.x`
- (b) дождаться релиза `pytest-asyncio` с поддержкой pytest 9
- (c) использовать `asyncio_mode=anyio` через `anyio` (уже в deps)

Рекомендация: (c) — миграция тестов на `anyio.pytest_plugin` не требует
ни даунгрейда, ни внешней зависимости. Реализовать одним sweep по
`tests/`.

### 4.6. Payouts V2 — контракт-документ

Слой добавлен (22 endpoint, worker/reaper/mock-advancer/scheduler), но
контракт-документа в `/audit/` нет.

**Фикс:** написать `audit/PAYOUTS_V2_STATE_MACHINE.md` по образцу
`MONEY_STATE_MACHINE.md` + `BLAST_RADIUS.md`.

---

## Track 5 · Integrations live-flip

Все интеграции в MOCK. Активация:

```bash
# backend/.env
INTEGRATIONS_LIVE_ENABLED=1
EMERGENT_LLM_KEY=sk-emergent-...    # Universal LLM (Claude/GPT/Gemini)
STRIPE_SECRET_KEY=sk_live_...       # или pod-default test-key
WAYFORPAY_MERCHANT=...              # UA-платежи
WAYFORPAY_SECRET=...
RESEND_API_KEY=re_...               # email
CLOUDINARY_CLOUD_NAME=...           # медиа
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
GOOGLE_CLIENT_ID=...                # OAuth
GOOGLE_CLIENT_SECRET=...
```

После `sudo supervisorctl restart backend` — все adapters перейдут в live
автоматически (контракт `integrations/live_adapters.py`).

**Verify:** `GET /api/integrations/manifest` — поле `mode` каждого capability
должно стать `live` (вместо `mock`).

---

## Track 6 · Self-hosted deployment

### Готово
- `scripts/bootstrap.sh` — bare-metal / VM запуск.
- `backend/gunicorn_conf.py` — production WSGI config.
- Supervisor configs (`/etc/supervisor/conf.d/`) для Emergent runtime.

### Не готово
- **Dockerfile** для backend + frontend + web.
- **docker-compose.yml** с MongoDB + 3 services + nginx ingress.
- **Helm chart** для Kubernetes (Emergent уже использует, но публичный chart
  отсутствует).
- CI/CD pipeline (GitHub Actions).

### Приоритет
LOW для production-stack (Emergent platform покрывает). HIGH для развёртывания
в private cloud клиента.

---

## Track 7 · Disk / runtime hygiene

- `/dev/nvme0n15` = 9.8 GB (Emergent dev container) **71% used** после установки.
- При попытке `pip install sentence-transformers` без очистки кэша — ENOSPC.
- **Bootstrap скрипт** делает `--no-cache-dir` для тяжёлых пакетов.
- Долгосрочное решение: монтировать `node_modules` и HF-кэш на отдельный volume.

---

## Приоритеты на следующую сессию

В порядке убывания:

1. **i18n batch 3** — 5 client-facing страниц
   (`ClientCabinet.js`, `ClientProjectPage.js`, `ClientBillingOS.js`,
   `ClientReferralPage.js`, `ClientProfilePage.js`). Время: ~1 ч.
2. **Web build** — `yarn build` + verify `/admin/` отвечает. Время: ~15 мин.
3. **Payouts V2 контракт** (`audit/PAYOUTS_V2_STATE_MACHINE.md`). Время: ~1 ч.
4. **/api/runtime/capabilities** — реализация endpoint'а. Время: ~30 мин.
5. **Amendment #2** (frozen-scope D1). Время: ~30 мин.
6. **Duplicate OperationID** fix (10 строк). Время: ~15 мин.
7. **pytest-asyncio** в requirements + verify тесты. Время: ~10 мин.
8. **i18n batch 4–8** (admin/dev сторона). Время: 4–6 ч.
9. **Docker / docker-compose**. Время: 3–4 ч.

---

_Документ ведётся непрерывно. Последняя ревизия — 2026-05-30._
