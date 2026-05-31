# Полный аудит проекта — 2026-FEB развёртывание (E1)

> **TL;DR**: Репозиторий https://github.com/svetlanaslinko057/3e23e3e13e1313 — **зрелая, активно развиваемая SaaS-платформа управления продуктовой разработкой** ("EVA-X" / AtlasOps). Содержит FastAPI backend (98 файлов корня, 178 .py всего, 644 API-эндпоинта), Expo mobile приложение (100 экранов), отдельный React web фронтенд, ~100 архитектурных аудит-документов и обширную доменную модель (money, escrow, payouts, decomposition, intelligence, governance). Backend + Expo подняты, frontend отрисовывает /welcome.

---

## 1. Развёртывание — статус

| Сервис | Статус | URL / порт |
|---|---|---|
| MongoDB | RUNNING | `mongodb://localhost:27017`, db `test_database` |
| Backend (FastAPI/uvicorn) | RUNNING | `0.0.0.0:8001`, prefix `/api` |
| Expo (Metro + ngrok tunnel) | RUNNING | `0.0.0.0:3000` |
| External preview | 200 OK | https://app-build-expo.preview.emergentagent.com |
| `/api/healthz` | 200 OK | `{"status":"ok"}` |

Backend сидит 6 разработчиков, 89 модулей, 81 QA decisions, 5 quick-access пользователей, демо-проект Acme Analytics, 14-дневный seed replay, notifications, integrations, money ledger индексы — всё стартует чисто за один цикл.

### 1.1 Действия, потребовавшиеся для запуска

1. **Перенос содержимого репозитория в `/app`** через `rsync` (исключая `.git`, `.emergent`, `node_modules`, `__pycache__`). Сохранены защищённые `.env` файлы.
2. **Backend Python-зависимости** — установлены недостающие пакеты, не входящие в базовый `requirements.txt`:
   - `python-socketio`, `python-engineio`, `aiohttp`, `litellm`, `openai`, `resend`,
     `stripe`, `slowapi`, `limits`, `pyotp`, `qrcode`, `reportlab`, `pillow`,
     `simple-websocket`, `beautifulsoup4`, `lxml`, `google-generativeai`,
     `google-genai`, `scikit-learn`.
   - `sentence_transformers` отсутствует — backend логирует "Embedding error for template …" но продолжает работу (graceful fallback). Не блокер.
3. **Expo-зависимости** — `yarn install` подтянул новые пакеты (`expo-audio`, `expo-secure-store`, `expo-asset`, `expo-image-picker`, `expo-location`, `expo-notifications`, `expo-auth-session`, `expo-document-picker`, `expo-clipboard`, `expo-crypto`, `expo-device`, `socket.io-client`, `axios`).
4. **Восстановлен правильный `/app/frontend/app/_layout.tsx`** из репозитория (с провайдерами `Theme/I18n/Auth/AuthGate/Feedback/StateShift/Validator/OnboardingTour`, AppHeader, BottomTabs, referral capture, observability). Предыдущая упрощённая версия с `useIconFonts` вызывала `Uncaught Error: Attempted to navigate before mounting the Root Layout component` при попытке `router.replace('/welcome')` из `index.tsx`.

### 1.2 Авторизационные seed-пользователи

| Роль | Email | Пароль |
|---|---|---|
| admin | admin@atlas.dev | admin123 |
| developer | john@atlas.dev | dev123 |
| client | client@atlas.dev | client123 |
| developer (multi-role) | multi@atlas.dev | dev123 |
| tester | tester@atlas.dev | tester123 |

`POST /api/auth/login` подтверждён вживую (200 OK + payload с user_id, roles, token).

---

## 2. Архитектура — обзор

### 2.1 Backend (`/app/backend`)

**~178 Python модулей**, монолитный `server.py` (28 221 строк) с разделением по доменным слоям:

| Слой | Ключевые модули |
|---|---|
| **Auth & identity** | `auth_otp.py`, `google_auth.py`, `two_factor` (в server.py) |
| **Decision / Decomposition** | `decision_layer.py`, `decomposition_engine.py`, `competitor_analyzer.py` |
| **Assignment & Acceptance** | `assignment_engine.py`, `acceptance_layer.py`, `client_acceptance.py` |
| **Money / Earnings / Escrow** | `earnings_layer.py`, `escrow_layer.py`, `escrow_api.py`, `client_escrow.py`, `money_bridge`, `payouts_v2`, `dev_wallet_reader.py`, `dev_work.py` |
| **Execution intelligence** | `execution_intelligence.py` (135 K — крупнейший файл), `event_engine.py`, `flow_control.py`, `auto_guardian.py` |
| **Developer experience** | `developer_brain.py`, `developer_economy.py`, `developer_intelligence.py`, `developer_support.py` |
| **Client surfaces** | `client_workspace.py`, `client_operator.py`, `client_operator_opportunities.py`, `client_transparency.py`, `client_costs.py` |
| **Admin** | `admin_actions.py`, `admin_users_layer.py`, `admin_mobile.py`, `admin_integrations.py`, `admin_system.py`, `admin_team.py`, `admin_risk.py`, `admin_production.py`, `admin_llm_settings.py` |
| **Legal** | `legal_contract_layer.py` (90 KB), `legal_settings.py` |
| **Integrations** | `cloudinary_service.py`, `email_service.py`, `integrations/settlement_stripe`, `integrations/settlement_paypal`, `emergentintegrations.llm` |
| **Compat / Routes** | `compat_routes.py`, `etap3_routes.py`, `autonomy_api.py`, `intelligence_api.py`, `integrations_api.py`, `payouts_v2_api`, `escrow_api.py` |

**API**: 644 эндпоинта (`@router/@app.get/post/put/delete/patch`), все под префиксом `/api`.

**MongoDB collections** (по grep `db.<name>.`): 100+ коллекций — `users`, `projects`, `modules`, `assignments`, `tasks`, `chat_messages`, `notifications`, `contracts`, `escrow_*`, `money_ledger`, `payouts_v2`, `dev_wallets`, `auth_codes`, `audit_log`, `cognition_events`, `decline_analytics`, `referrals`, `validation_campaigns`, `competitor_url_cache`, `legal_*` и т.д.

**Фоновые воркеры** при старте:
- `EVENT ENGINE` — детектор раз в 15 мин
- `PAYOUTS_V2` worker (5s), reaper (30s), mock advancer (5s), scheduler (900s), reconciler (1800s)
- `GUARDIAN` (120s), `MODULE_MOTION` (15s), `OPERATOR_SCHEDULER` (300s), `TEAM_BALANCER` (cycle log)
- `MONEY BRIDGE` (Phase 2B PR-1)
- `CONTRACT REMINDER LOOP` (6h)

### 2.2 Mobile (`/app/frontend`, Expo SDK 54)

100 .tsx маршрутов в `/app/frontend/app`. Файлово-роутерная архитектура с группами:

- **Корневые гейты**: `index.tsx` (роутинг по auth), `welcome.tsx`, `auth.tsx`, `two-factor-challenge.tsx`, `gateway.tsx`, `hub.tsx`
- **Клиентский поток**: `describe.tsx`, `estimate-improve.tsx`, `estimate-result.tsx`, `project-booting.tsx`, `client/*`, `project/*`, `contract/*`
- **Разработчик**: `developer/*`, `account.tsx`, `activity.tsx`
- **Админка**: `admin/*` (16 экранов)
- **Поддержка / общее**: `chat.tsx`, `inbox.tsx`, `documents.tsx`, `help/*`, `portfolio/*`, `lead/*`, `operator/*`, `tester/*`, `settings.tsx`, `profile.tsx`

`/app/frontend/src` — 60+ shared компонентов и сервисов (design tokens, theme, i18n, auth, feedback, motion, push, realtime, observability, runtime client, route resolver, onboarding tours).

### 2.3 Web (`/app/web`)

Отдельный React (CRA-style с craco), не запускается на платформе автоматически. Структура: `src/{components, contexts, hooks, layouts, lib, pages}`, tailwind + postcss. Это публичный сайт / landing — не часть Expo preview.

### 2.4 Documentation (`/app/audit`)

102 markdown-документа: архитектурные аудиты, контракты (MONEY_AUTHORITY_CHARTER, SUBSTRATE_CONTRACT, MONEY_STATE_MACHINE), phase closeout'ы, scope-benchmarks, blast-radius анализы. Это **знание о платформе, формализованное в коде** — каждый PR оставлял свой документ.

---

## 3. Найденные проблемы (по приоритету)

| # | Severity | Файл / область | Проблема | Рекомендация |
|---|---|---|---|---|
| 1 | LOW | `requirements.txt` | Не содержит ряд runtime-зависимостей (socketio, litellm, openai, stripe, slowapi, …) — backend импортирует, но в файле их нет | После стабилизации запустить `pip freeze > /app/backend/requirements.txt` (полный список в репо `/tmp/repo2/backend/requirements.txt` уже корректен, но в `/app` остался старый) |
| 2 | LOW | `server.py` startup | `Embedding error … No module named 'sentence_transformers'` для 4 scope-шаблонов | Опционально: `pip install sentence-transformers` (+1.5 GB места) — иначе semantic-similarity для project templates отключена, но всё прочее работает |
| 3 | LOW | Expo console | Warnings: `borderColor: "var(--t-primary)44"` (RN не поддерживает CSS custom properties), `props.pointerEvents` deprecated, `shadow*` deprecated | Косметика веб-режима — на iOS/Android не проявляется. Можно почистить в `theme-tokens.ts` |
| 4 | INFO | `cloudinary_service` | MOCK-режим (нет CLOUDINARY ключей) — файлы пишутся локально | Если нужен прод: задать `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` |
| 5 | INFO | `email_service` | `RESEND_API_KEY not set` — рассылки выключены, OTP в mock-режиме | Задать `RESEND_API_KEY` для реальных писем |
| 6 | INFO | `integrations.settlement_paypal` | DORMANT — `PAYPAL_CLIENT_ID/SECRET/WEBHOOK_ID` не заданы | Опционально |
| 7 | INFO | `google_auth` | enabled=false в `/api/config/public` (нет `client_id`) | Опционально для Google Sign-In |

Критических ошибок не обнаружено. Все 644 эндпоинта зарегистрированы, фоновые воркеры стартовали.

---

## 4. Доменная модель (краткий конспект из `/app/audit`)

Платформа = **AI-управляемая фабрика разработки**:
- Клиент описывает идею (`/describe`) → AI декомпозирует в модули с ценой/сроком → клиент акцептит → платформа назначает разработчиков (`assignment_engine`) → разработчик принимает (`acceptance_layer`) → выполняет (`execution_intelligence`, `dev_work`) → тестер валидирует → QA одобряет → escrow освобождает деньги → выплата через `payouts_v2` (Stripe Connect / PayPal Payouts / mock).

Money-stack отдельный — `MONEY_AUTHORITY_CHARTER`, `MONEY_STATE_MACHINE`, `dev_wallet_reader`, `money_bridge`, двойная запись через `money_ledger`. В audit'ах задокументирована миграция с legacy `dev_wallets` writer'ов на canonical money state (Phase 2C).

Дополнительные системы: cognition events (override / dismiss AI решения), referral programm, validation campaigns, competitor URL анализ, legal contracts с OTP-подписью, observability с глобальным error reporter.

---

## 5. Что готово к продолжению разработки

1. ✅ Backend + Expo + MongoDB подняты, тунель работает, preview URL доступен внешне.
2. ✅ Seed-данные на месте: 5 quick-access пользователей × 5 ролей, демо-проект, 89 модулей, события, нотификации.
3. ✅ Auth подтверждён вживую (`/api/auth/login` 200 OK).
4. ✅ Конфиг публичный (`/api/config/public`) отдаёт Stripe test publishable key, app preview URL.
5. ✅ Welcome-экран EVA-X отрисовывается в web-режиме Expo.
6. ✅ Test credentials записаны в `/app/memory/test_credentials.md`.

---

## 6. Что стоит обсудить дальше

1. **Цель этой итерации** — что именно делать: новая фича, конкретный экран, миграция web-сайта на Expo, починка какого-то существующего флоу?
2. **Production интеграции** — нужны ли реальные ключи Stripe / Resend / Cloudinary / Google OAuth, или продолжаем в mock-режиме?
3. **Web-сайт** (`/app/web`) — отдельно деплоить или мержить в Expo `output: "static"`?
4. **Embedding** (`sentence-transformers`) — устанавливать или жить с fallback'ом?
5. **Подчистить `requirements.txt`** до фактических зависимостей сейчас или позже?

---

*Аудит произведён E1 после полного `rsync` + установки зависимостей + однократного перезапуска супервизора.*
*Версия документа: 2026-02-29-FEB-REDEPLOY-E1-RU*
