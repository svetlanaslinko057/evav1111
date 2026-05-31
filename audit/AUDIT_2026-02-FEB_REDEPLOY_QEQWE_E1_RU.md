# АУДИТ — Полный передеплой ATLAS DevOS / EVA-X
**Сессия:** 2026-02-FEB (новый pod, GitHub repo `svetlanaslinko057/qeqwe12`)
**Агент:** E1
**Статус:** ✅ ВСЁ ПОДНЯТО, СТАБИЛЬНО

---

## 1. Исходное состояние

- Pod создан пустым (только Emergent-стартер). Папка `/app` содержала только бойлерплейт `server.py` + `index.tsx`.
- Реальный код проекта лежал на GitHub `svetlanaslinko057/qeqwe12@main` (commit `fdefa1f`, 13 коммитов, языки Python 48% / JS 29% / TS 22%).
- Это **существующая платформа уровня production** (EVA-X / ATLAS DevOS) с длинной историей разработки — в репо 121 audit-файл, 25+ closeout-документов, sealed substrates.

## 2. Что сделано в этой сессии

| Шаг | Результат |
|---|---|
| Клонирован `svetlanaslinko057/qeqwe12` → `/tmp/qeqwe12` (depth=1) | ✅ |
| Rsync в `/app` с сохранением `.git`, `.emergent`, `backend/.env`, `frontend/.env` | ✅ |
| Установлены Python-зависимости (`pip install -r backend/requirements.txt --no-cache-dir`, исключив повторно ставшие в дереве `nvidia-*`, `cuda-*`) | ✅ 148/170 пакетов |
| Доставлен `python-socketio[asyncio_client]` (отсутствовал в чистой venv) | ✅ |
| `yarn install` во `frontend/` (lockfile сгенерирован) | ✅ 8.5s |
| `supervisorctl restart backend expo` | ✅ оба зелёные |
| Записаны `memory/test_credentials.md` (admin/dev/client/tester) | ✅ |

## 3. Архитектура проекта (по факту)

### 3.1 Состав

```
/app
├── backend/          7.7 MB,  193 .py,  100 836 LOC, FastAPI
├── frontend/         906 MB (с node_modules), 99 .tsx экранов, Expo SDK 54
├── web/              14 MB, CRA build (React 19 + Radix + Tailwind), 53 страниц
├── packages/         design-system + runtime-client (монорепо-стиль)
├── docs/             active-audits, runtime-contracts, observation snapshots
├── audit/            121 файлов — phase closeouts, charters, smoke traces
├── memory/           PRD.md + active_issues.md (карта sealed substrates)
├── tests/            корневые архитектурные тесты
└── tools/            утилиты scan_tokens.sh и пр.
```

### 3.2 Backend — FastAPI

- **Точка входа:** `backend/server.py` (1 075 884 байт, 27.8K LOC). Регистрирует **732 endpoints** (по `/openapi.json`).
- **Доменные слои** (главные):
  - `auth_otp.py`, `two_factor.py`, `google_auth.py` — аутентификация (email + OTP, 2FA, Google OAuth scaffold)
  - `account_layer.py`, `admin_users_layer.py` — пользователи + RBAC (admin/developer/client/tester)
  - `escrow_layer.py`, `escrow_api.py`, `client_escrow.py` — escrow-логика
  - `earnings_layer.py` (42 KB), `payout_layer.py`, `payouts_v2*.py` — заработок и выплаты (Stripe Connect + PayPal scaffold)
  - `money_*.py` (bridge, ledger, projections, divergence, runtime, replay) — sealed money substrate (Phase 2C-B)
  - `legal_contract_layer.py` (89 KB) — контракты P3..P8 (data-minimization, Fernet, AES gate)
  - `work_execution.py`, `execution_intelligence.py` (135 KB!), `decision_layer.py` — движок исполнения
  - `mobile_adapter.py` (52 KB), `admin_mobile.py` (44 KB) — адаптеры под Expo
  - `time_tracking_layer.py` (55 KB), `validation_campaigns.py`, `qa_layer.py` — тайм-трекинг + QA
  - `pricing_engine.py`, `revenue_brain.py`, `scaling_engine.py`, `operator_engine.py`, `team_balancer.py` — pricing/operator/scaling intelligence
  - `event_engine.py`, `auto_guardian.py`, `module_motion.py`, `flow_control.py` — фоновые петли
  - `cloudinary_service.py`, `email_service.py`, `stt_service.py`, `push_sender.py` — внешние интеграции
  - `observability.py` — Sentry hook + frontend error sink
  - `domains/money/` — DDD-слой (events / models / policies / service)
  - `infrastructure/db/` — репозитории Mongo (base/users/modules/projects/money)
  - `integrations/` — payment / settlement / oauth / mail / ai / storage адаптеры (DI-стиль)
  - `payment_providers/` — Stripe / PayPal / WayForPay / mock

- **Фоновые задачи** (стартуют на lifespan):
  - PAY-V2 worker (5s), reaper (30s), mock advancer (5s), scheduler (900s)
  - Reconciler observer (1800s) — passive, never mutates
  - Module Motion (15s), Guardian (120s), Event Engine (15min), Contract Reminder (21600s)

- **Seed-логика на старте:** mock-провайдеры, портфолио кейсы, 5 quick-access юзеров (admin/john/client/multi/tester), 6 разработчиков, 89 модулей, 81 QA-решений, demo-проект "Acme Analytics Platform", 70 replay-событий за 14 дней.

### 3.3 Mobile — Expo SDK 54 (frontend/)

- Expo Router v6, **99 экранов** в 11 ролевых ветках (`admin/`, `developer/`, `client/`, `operator/`, `tester/`, `lead/`, `portfolio/`, `project/`, `contract/`, `help/`, корень).
- Шрифты: `@expo-google-fonts/instrument-sans` + `jetbrains-mono`.
- Иконки: `@expo/vector-icons` + кастомные.
- Хранилище: `@react-native-async-storage/async-storage` + `expo-secure-store` (есть обёртка `src/utils/storage`).
- Auth: `expo-auth-session`.
- Камера/документы: `expo-image-picker`, `expo-document-picker`.
- Push: `expo-notifications` (готово, требует google-services.json).
- Аналитика клиентских ошибок: `frontend/src/observability.ts` → POST `/api/observability/client-error`.
- Welcome-экран рендерится корректно (EVA-X, "Build real products. Not tasks.", SEQ-01/02/03 flow).

### 3.4 Web — CRA admin (web/)

- React 19, Radix UI, Tailwind, lucide-react.
- Билд лежит в `web/build/` (530 KB gzip).
- Сервируется бэкендом по `/api/web-ui/` (HTTP 200 ✅).
- 53 экрана в `web/src/`.

### 3.5 Packages

- `packages/design-system/` — общий дизайн (tokens, components).
- `packages/runtime-client/` — общий API-клиент (миграция отражена в `audit/RUNTIME_CLIENT_MIGRATION_COMPLETE.md`).

## 4. Состояние развёртывания

| Сервис | Статус | Порт | Подтверждение |
|---|---|---|---|
| backend (FastAPI/uvicorn) | ✅ RUNNING | 8001 | `GET /api/healthz` → `{"status":"ok"}`; `/api/` → `{"message":"Development OS API","version":"1.0.0"}` |
| expo (Metro tunnel, --tunnel --port 3000) | ✅ RUNNING | 3000 | Tunnel ready, welcome-screen рендерится |
| mongodb | ✅ RUNNING | 27017 | seed успешен, индексы созданы |
| Web admin (CRA build) | ✅ SERVED | `/api/web-ui/` | HTTP 200, HTML отдаётся |

## 5. Тест аутентификации (live smoke)

Все четыре seed-аккаунта залогинились через `POST /api/auth/login` с HTTP 200:

| Email | Password | role | active_role |
|---|---|---|---|
| admin@atlas.dev | admin123 | admin | admin |
| john@atlas.dev | dev123 | developer | developer |
| client@atlas.dev | client123 | client | client |
| tester@atlas.dev | tester123 | tester | tester |

Записаны в `/app/memory/test_credentials.md` для последующих сессий и testing-агента.

## 6. Интеграции (текущий режим)

| Возможность | Режим | Env для live |
|---|---|---|
| Платежи (Stripe Connect) | **DORMANT** | `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` |
| PayPal Payouts | **DORMANT** | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` |
| WayForPay | scaffold | `WAYFORPAY_*` (4 переменные) |
| Email (Resend) | mock | `RESEND_API_KEY` |
| Storage (Cloudinary) | mock | `CLOUDINARY_*` (3) |
| OAuth Google | unavailable | `GOOGLE_CLIENT_ID` |
| AI (LLM) | **готова через Emergent LLM Key** | `EMERGENT_LLM_KEY` (нужно добавить в `backend/.env`) |
| Sentry | DORMANT | `SENTRY_DSN` |
| 2FA / OTP | mock-mail | — (готов flip через `RESEND_API_KEY`) |

Все DORMANT-адаптеры **не падают** на отсутствии ключей — логируют WARNING и идут в no-op (правильно).

## 7. Sealed substrates (по `memory/active_issues.md`)

- **WEB Stabilization Line** — SEALED 2026-FEB-24
- **CONTRACTS LOGIC P3..P8** — SEALED 2026-05-24
- **PAYOUTS V2** — P0/P1/P2A/P3/P4/P5 SEALED; pending **P2B (PayPal live)**
- **MONEY substrate Phase 2C-B** — SEALED (`backend/scripts/audit/pay_v2_master.py` — мастер-гард)

## 8. Замечания и риски (минорные)

1. **`requirements.txt` тянет CUDA / torch / nvidia-* (~5 GB)** — для текущего бэкенда не используется (`grep import torch` пусто). Рекомендую сделать CPU-only slim либо вынести ML-deps в `requirements-ml.txt`. *Не блокирует.*
2. **`python-socketio` отсутствует в `requirements.txt`**, хотя `server.py` его импортирует (`import socketio`). Я доставил вручную; нужно добавить в pinned requirements при следующем коммите.
3. **Duplicate Operation IDs** в OpenAPI (warnings от FastAPI): `fail_validation`, `audit_log`, `list_users_v2`, `get_user_detail`, `block_user`, `unblock_user`, `change_role`, `logout_all`, `soft_delete`. Не падает, но мешает кодогену Swagger-клиента. Лечится `operation_id="..."` на `@router.post(...)`.
4. **`yarn.lock` отсутствует в репо** (был в .gitignore?). Только что регенерирован при `yarn install` — рекомендую коммитнуть для воспроизводимости.
5. **Welcome-экран Expo рендерится статично** (текст и SEQ-кнопки видны), но кнопка "See my product plan" пока не проверена в e2e. *Это можно сделать в следующей сессии через testing_agent.*
6. **EMERGENT_LLM_KEY** не задан в `backend/.env` текущего pod-а (был в предыдущих сессиях). Если нужен AI-функционал — добавлю по запросу.
7. **Метрики проекта:** ~100K LOC backend, ~70K LOC frontend+web — это объём крупного коммерческого продукта. Любая модификация требует выборочного, осторожного подхода и обязательного запуска `pay_v2_master.py` после правок money-слоя.

## 9. Что готово к работе прямо сейчас

- ✅ Регистрация / логин (email+пароль, 4 роли)
- ✅ Demo-проект клиента "Acme Analytics Platform" с 3 модулями
- ✅ Mock-биллинг с 6 инвойсами
- ✅ 89 модулей в пуле + 81 QA-решений
- ✅ Replay-события (16 overrides + 14 qa_fail + 19 reassign + 12 overload + 9 suppression)
- ✅ Все фоновые петли (Guardian / Module Motion / Operator / Event / PAY-V2 / Reconciler / Contract Reminder)
- ✅ Web admin доступен в браузере по `/api/web-ui/`
- ✅ Mobile preview по Expo Go (QR через tunnel) или web-preview `https://qeqwe-mobile.preview.emergentagent.com`

## 10. Что НЕ работает без live ключей

- Реальные платежи через Stripe / PayPal
- Реальная отправка email (всё идёт в mock-mail логи)
- Загрузка файлов в Cloudinary (сейчас сохраняются локально)
- AI-фичи (если не добавить `EMERGENT_LLM_KEY`)
- Sentry-репортинг

## 11. Рекомендации к продолжению

Пользователь сказал *"после чего мы продолжим"* — жду указаний. Возможные направления (по `active_issues.md`):

1. **PAY-V2 → P2B** — поднять PayPal live (+ webhook).
2. **AI / automation** — подключить `EMERGENT_LLM_KEY` (могу автоматом).
3. **Analytics / Billing V2 / Forecasting / Growth / Referral / Operator systems** — все разморожены, FREEZE снят.
4. **Чистка тех. долга:** slim requirements.txt, починить duplicate operation IDs, добавить `python-socketio` в pinned deps, коммит `yarn.lock`.

---

**Подписан:** E1 · `commit fdefa1f` · `2026-02-FEB` · pod `qeqwe-mobile.preview.emergentagent.com`
