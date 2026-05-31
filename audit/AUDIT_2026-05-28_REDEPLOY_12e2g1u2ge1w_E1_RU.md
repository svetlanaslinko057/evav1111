# AUDIT — ATLAS DevOS / EVA-X — Полный редеплой & аудит репозитория `12e2g1u2ge1w`

**Дата:** 2026-05-28
**Источник:** `https://github.com/svetlanaslinko057/12e2g1u2ge1w` (branch `main`, HEAD `2a90350` — Auto-generated changes, Thu May 28 18:06:43 2026 +0000)
**Цель сессии:** Полный clone → rsync → deps → restart → smoke + аудит. Без новой разработки.
**Сессия:** E1, новая (пользователь запросил «Разверни полностью данный проект, изучи репозиторий, полностью сделай аудит»).

---

## 1. Развёртывание — ✅ ПОЛНОСТЬЮ ЖИВОЕ

| Сервис | Статус | Порт | Примечание |
|---|---|---|---|
| backend (FastAPI / uvicorn --reload) | ✅ RUNNING | 8001 | **735 роутов**, все фоновые циклы up |
| expo (Metro tunnel) | ✅ RUNNING | 3000 | Welcome bundled (1563 модуля), tunnel ready |
| mongodb | ✅ RUNNING | 27017 | сидинг прошёл (12 users, 99 modules, 105 QA, 3 projects, 6 invoices) |
| Web admin (CRA build) | ✅ SERVED | `/api/web-ui/` | bundle собран `yarn build`, обслуживается FastAPI |
| nginx-code-proxy | ✅ RUNNING | — | вспомогательный (для code-server, выключен) |

### Шаги развёртывания

1. `git clone --depth 1 https://github.com/svetlanaslinko057/12e2g1u2ge1w → /tmp/repo_clone` (17 447 файлов, 401 MB).
2. Бэкап `/app/backend/.env`, `/app/frontend/.env`, `/app/.emergent` в `/tmp/preserve/`.
3. Удалены все корневые элементы `/app/` кроме `.git`, `.emergent`, `backend/`, `frontend/` (где node_modules).
4. `rsync -a --exclude=.git --exclude=.emergent --exclude=node_modules` из `/tmp/repo_clone/` в `/app/`.
5. Восстановлены preserved `.env` (preview-URL и MONGO_URL остались родными для контейнера).
6. Backend deps: `pip install -r requirements.txt` — установлено 60+ обновлений (boto3, transformers, pandas, etc.); `emergentintegrations` приведён к версии `0.1.0` из requirements.
7. Frontend deps: `cd /app/frontend && yarn install` — успешно (9 c).
8. Web deps: `cd /app/web && yarn install` — успешно (43 c).
9. Web build: `cd /app/web && yarn build` → `/app/web/build/` (готов к раздаче через `/api/web-ui/`).
10. `sudo supervisorctl restart backend`; expo был перезапущен (он автоматически подхватил изменение `metro.config.js`).

---

## 2. Smoke-результаты (live, 2026-05-28 ~19:43 UTC)

| Тест | Результат |
|---|---|
| `GET /api/healthz` | ✅ 200 — `{"status":"ok"}` |
| `GET /api/web-ui/` (CRA bundle) | ✅ 200 — HTML отдаётся (9 333 байт) |
| `GET /api/portfolio/cases` | ✅ 200 — 5 кейсов (Logistics Tracking System, etc.) |
| `GET /api/integrations/manifest` | ✅ 200 — все capabilities помечены mock/dormant/unavailable |
| `POST /api/auth/login` admin/admin123 | ✅ 200 — `role=admin` |
| `POST /api/auth/login` john/dev123 | ✅ 200 — `role=developer` |
| `POST /api/auth/login` client/client123 | ✅ 200 — `role=client` |
| `POST /api/auth/login` tester/tester123 | ✅ 200 — `role=tester` |
| `POST /api/mobile/auth/demo` | ✅ 200 — токен 37 символов, `roles=['client']` |
| Expo Welcome (через tunnel) | ✅ 200 — рендерит EVA-X / "Build real products. Not tasks." / SEQ-01/02/03 |
| Web-UI Welcome | ✅ 200 — рендерит EVA-X "Software, actually shipped" + execution pipeline preview |
| OpenAPI routes (total) | **735** |

### Фоновые циклы (живые, подтверждено в `backend.out.log` / `backend.err.log`)

- **PAY-V2:** worker (5s, batch 10, lease 60s) / reaper (30s) / mock advancer (5s, delay 2s) / scheduler (900s)
- **Guardian** (120s)
- **Module Motion** (15s) — фактически наблюдается переход `Dashboard UI in_progress→review→done`, `Charts & analytics`, `Authentication`, `User management` каскадом каждые 30 c
- **Operator scheduler** (300s)
- **Event engine** (15 min)
- **Contract Reminder** (21600s = 6h)
- **Autonomy scanner** (отчитался `evaluated=0 created=0 executed=0`)

---

## 3. Архитектура репозитория

### 3.1 Backend (FastAPI)

| Метрика | Значение |
|---|---|
| Python-модулей в `backend/` | 97 |
| LOC в `server.py` | ~27 959 |
| Дочерние API-модули (под-router'ы) | `acceptance_layer`, `account_layer`, `admin_*` (×11), `assignment_engine`, `auth_otp`, `auto_guardian`, `autonomy_*`, `client_*` (×7), `cloudinary_service`, `decomposition_engine`, `event_engine`, `time_tracking_layer`, `payouts_v2`, `money_bridge`, `validation_campaigns`, `legal_contract`, ... |
| Всего эндпоинтов | **735** (все с префиксом `/api/`) |

#### Топ-группы эндпоинтов

| Группа | Кол-во |
|---|---|
| `/api/admin/*` | 262 |
| `/api/developer/*` | 73 |
| `/api/client/*` | 66 |
| `/api/account/*` | 23 |
| `/api/modules/*` | 23 |
| `/api/payouts-v2/*` | 22 |
| `/api/execution-intelligence/*` | 19 |
| `/api/auth/*` | 18 |
| `/api/ai/*` | 13 |
| `/api/contracts/*` | 12 |
| `/api/mobile/*` | 10 |
| `/api/system/*` | 10 |

### 3.2 Frontend (Expo SDK 54)

| Метрика | Значение |
|---|---|
| `.tsx` файлов в `frontend/app/` | 100 |
| Сегменты роутинга (директории) | admin/, developer/, client/, operator/, tester/, lead/, portfolio/, project/, contract/, help/, plus root screens |
| Корневые экраны | `index.tsx`, `auth.tsx`, `account.tsx`, `chat.tsx`, `documents.tsx`, `estimate-*`, `gateway.tsx`, `hub.tsx`, `inbox.tsx`, `operator.tsx`, `profile.tsx`, `settings.tsx`, `two-factor-challenge.tsx`, `describe.tsx`, `project-booting.tsx`, `+html.tsx`, `_layout.tsx` |
| Стек | expo-router 6.0.22, react-native 0.81.5, react 19.1.0, react-native-reanimated 4.1.1 |
| Storage util | `/app/frontend/src/utils/storage` (универсальный обёртка) |

### 3.3 Web (React CRA + Tailwind, served by FastAPI)

| Метрика | Значение |
|---|---|
| Pages / страниц (`web/src/pages/`) | 97 (`.js`) |
| Build target | CRA 5 + `craco`, output → `web/build/`, served под `homepage="/api/web-ui"` |
| UI library | Radix UI + Tailwind 3 + sonner + recharts + cmdk + lucide-react |
| Roles in URL | `/client/*`, `/developer/*`, `/admin/*`, `/operator/*` |
| Архитектура auth | cookie-based, `withCredentials: true`, против `/api/auth/*` |

### 3.4 Packages (workspace)

- `packages/design-system` — общий дизайн-токен / компоненты
- `packages/runtime-client` — runtime API client (миграция отчасти зафиксирована в `audit/RUNTIME_CLIENT_MIGRATION*.md`)

### 3.5 MongoDB (после сидинга)

| Collection | Documents |
|---|---|
| users | 12 |
| modules | 99 |
| qa_decisions | 105 |
| system_actions_log | 51 |
| cognition_overrides | 34 |
| money_ledger_events | 30 |
| developer_scores | 8 |
| invoices | 6 |
| dev_earning_log | 6 |
| portfolio_cases | 5 |
| auto_actions | 5 |
| client_notifications | 3 |
| projects | 3 |
| payouts | 3 |
| support_tickets | 3 |
| deliverables | 2 |
| providers | 2 |
| scope_templates | 4 |
| dev_wallets | 1 |
| replay_markers | 1 |
| validation_issues | 1 |
| competitor_url_cache | 0 (TTL 24h) |
| escrows, escrow_payouts, module_assignments, payout_batches_v2, payout_items_v2, payout_v2_events, payout_v2_idempotency, dev_payment_profiles, team_score_history, team_scores, trusted_devices, two_factor_challenges, validation_campaigns, validation_submissions | 0 (создаются по событиям) |

---

## 4. Интеграции и ключи (см. `/api/integrations/manifest`)

| Capability | Mode | Available | Reason |
|---|---|---|---|
| payment | mock | true | `STRIPE_SECRET_KEY` missing |
| mail | mock | true | `RESEND_API_KEY` missing |
| storage | mock | true | `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` missing |
| oauth | **unavailable** | **false** | `GOOGLE_CLIENT_ID` missing |
| ai | mock | true | `EMERGENT_LLM_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` all missing |
| settlement | mock | true | `STRIPE_SECRET_KEY` missing (+ PayPal dormant) |

### Что нужно для перевода в LIVE

| Сервис | Переменные `.env` |
|---|---|
| Stripe (приём денег + Connect payouts) | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, optionally `STRIPE_CONNECT_*` |
| PayPal Payouts | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` |
| Resend (email) | `RESEND_API_KEY`, optionally `RESEND_FROM` |
| Cloudinary (файлы) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Google OAuth (логин) | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (либо Emergent Google Auth) |
| LLM (Claude/Gemini/GPT) | `EMERGENT_LLM_KEY` (универсальный) — или индивидуальные `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` |
| Sentence-transformers (embeddings для scope templates) | `pip install sentence_transformers` — сейчас в логах `Embedding error for template Online Marketplace: No module named 'sentence_transformers'` |

Все слои сейчас в режиме **soft-mock** (платежи и settlement — hard-mock, но эмулируются), — приложение полностью работает и проходит smoke без реальных ключей.

---

## 5. Найденные несовершенства / TODO

### 5.1 Backend warnings при старте

```
sentence_transformers — отсутствует, 4 embedding-предупреждения для scope_templates
```
**Импакт:** низкий — `scope_templates` сидируются без векторов, семантический поиск scope-template'ов работает в degraded mode.
**Фикс:** добавить `sentence-transformers` в `requirements.txt` (объёмно — ~2 GB) либо вынести в опциональный extras.

### 5.2 Duplicate Operation IDs в OpenAPI

В `admin_users_layer.py` дублируются IDs: `block_user`, `unblock_user`, `change_role`, `logout_all`, `soft_delete`. FastAPI варнинг — на работу не влияет, но клиентам со строгой схемой (e.g. openapi-generator) может мешать.
**Фикс:** добавить уникальный `operation_id=` на каждом эндпоинте в `admin_users_layer.py` (~30 строк изменений).

### 5.3 Expo runtime warnings (web)

- `Invalid style property of "borderColor". Value is "var(--t-primary)44"` — попытка использовать CSS-переменную с прозрачностью через постфикс. React Native StyleSheet не поддерживает.
- `props.pointerEvents is deprecated. Use style.pointerEvents`
- `style.resizeMode is deprecated. Please use props.resizeMode`
- `"shadow*" style props are deprecated. Use "boxShadow"`
- `[expo-notifications] Listening to push token changes is not yet fully supported on web`

**Импакт:** косметика; кросс-платформенно работает, но web-консоль шумит.

### 5.4 Старый APP_URL в supervisor

```
environment=APP_URL="https://670b42d1-6dec-4465-b07f-153189b14895.preview.emergentagent.com"
```
Это значение **захардкожено** в `/etc/supervisor/conf.d/supervisord.conf` (которое read-only согласно платформе). Текущий preview-домен — `expo-mobile-dev-4.preview.emergentagent.com`. Это влияет на серверные redirect'ы / OAuth callbacks (если бы они были включены), но не на основной поток.
**Фикс:** платформа автоматически обновит при следующем restart pod; для текущей сессии не критично.

### 5.5 `audit/` и `docs/` — высокий объём ретроспективы

В `audit/` 99 markdown-файлов с историей решений и аудитов с февраля по май 2026, плюс ~20 JSON-снимков baseline / contract_map / smoke trace. В `docs/` — charter'ы scope freeze, governance, runtime-contracts. Это **knowledge base** — не код. Хранить полезно, но при clone в pod создаёт overhead (~25 MB сами .md).

### 5.6 `tools/` и `scripts/`

| Что | Назначение |
|---|---|
| `scripts/` (root) | смешанные shell/python скрипты для audit, seed, runtime probes |
| `tools/` | классификаторы, синтетические probe-наборы |
| `web/scripts/audit/` | web-specific scope-benchmark скрипты |
| `audit/scan_tokens.sh` | grep на токены / hardcoded keys |

Все они изолированы — на основной runtime не влияют.

---

## 6. Sealed substrates (по знаниям из существующих audit-файлов)

Эти подсистемы помечены как «sealed» / production-ready в предыдущих сессиях и **не должны** модифицироваться без отдельного charter:

- **Money Substrate** (`audit/MONEY_*.md`, `audit/PHASE_2C_*.md`) — phases 0/1/2A/2B (PR1-3)/2C (B1-B4.5, D), включая dev wallet projection flip и replay backfill.
- **Web Stabilization Line** (`audit/WEB_P2_CLOSEOUT_*.md`, `WEB_P3_CLOSEOUT_*.md`) — P3..P6.
- **Contracts substrate** (см. `audit/CONTRACTS.md` в backend) — P3..P8.
- **Payouts V2** (`audit/PAYOUTS_V2_*` / `audit/PHASE_2C_B4_*`) — P0+P1+P2A+P3+P4+P5.
- **Substrate Sealing Review** (`audit/SUBSTRATE_SEALING_REVIEW_SIGNOFF.md`).

При любых изменениях затрагивающих эти зоны — сначала smoke baseline (`audit/escrow_smoke_trace_baseline.json`, `audit/withdrawal_smoke_trace_baseline.json`, `audit/work_execution_smoke_trace_baseline.json`, `audit/seed_money_bridge_replay.json`), затем изменение, затем повторный smoke с diff.

---

## 7. Тестовые креды (`memory/test_credentials.md` обновлён)

| Email | Password | Role |
|---|---|---|
| admin@atlas.dev | admin123 | admin |
| john@atlas.dev | dev123 | developer |
| client@atlas.dev | client123 | client |
| tester@atlas.dev | tester123 | tester |
| multi@atlas.dev | dev123 | developer |

Все 4 основных логина подтверждены 200 OK с правильным `role`.

---

## 8. Готовность к следующему шагу

✅ Развёрнуто, ✅ сидинг прошёл, ✅ все 3 surface'а (backend / mobile-expo / web-CRA) живы и отдают полный UI, ✅ smoke зелёный.

**Ожидается от пользователя следующее указание:**

> «после чего мы продолжим. Все есть в коде, мы только начинаем данную разработку и делаем веб сайт и моб приложение експо»

— требуется конкретный фичерлист (нет в этой сессии). Готов принимать таски на:

- Конкретные доработки экранов мобильного приложения (Expo)
- Конкретные доработки страниц web-админки / клиент-портала
- Конкретные backend-эндпоинты, нюансы существующих
- Подключение реальных интеграций (Stripe / Google OAuth / Resend / Cloudinary / EMERGENT_LLM_KEY) — потребуются ключи от пользователя
- Фикс перечисленных в §5 несовершенств (duplicate operation IDs, expo style warnings и т.п.)

---

## 9. Артефакты этой сессии

- `audit/AUDIT_2026-05-28_REDEPLOY_12e2g1u2ge1w_E1_RU.md` — этот файл
- `memory/test_credentials.md` — обновлён
- `memory/PRD.md` — обновлён (см. отдельный шаг)
- Скриншоты живых surface'ов получены через `mcp_screenshot_tool` (preview URL подтверждён рабочим)
