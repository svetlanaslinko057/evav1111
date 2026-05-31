# AUDIT — ATLAS DevOS / EVA-X — Полный редеплой & аудит репозитория `12e21e213e13`

**Дата:** 2026-05-28
**Источник:** `https://github.com/svetlanaslinko057/12e21e213e13` (branch `main`, HEAD `6c56932` — Auto-generated changes)
**Цель сессии:** Полный clone → rsync → deps → restart → smoke + аудит. Без новой разработки.

---

## 1. Развёртывание — ✅ ПОЛНОСТЬЮ ЖИВОЕ

| Сервис | Статус | Порт | Примечание |
|---|---|---|---|
| backend (FastAPI) | ✅ RUNNING | 8001 | 732 роута, все фоновые циклы up |
| expo (Metro tunnel) | ✅ RUNNING | 3000 | Welcome bundled (1559 модулей), tunnel ready |
| mongodb | ✅ RUNNING | 27017 | сидинг прошёл (12 users, 99 modules, 105 QA, 3 projects, 6 invoices) |
| Web admin (CRA build) | ✅ SERVED | `/api/web-ui/` | 530 KB gzip |
| nginx-code-proxy / code-server | ✅ RUNNING | — | вспомогательные |

### Шаги развёртывания

1. `git clone https://github.com/svetlanaslinko057/12e21e213e13 → /tmp/repo` (~20 800 файлов).
2. `rsync -a --delete` в `/app/` с исключениями: `.git`, `.emergent`, `.env`, `node_modules`, `.metro-cache`, `__pycache__` — чтобы сохранить preview-конфиг и не дёргать тяжёлые директории.
3. Backend deps: `pip install -r requirements.txt --no-cache-dir` (149 пакетов, CUDA/torch/sentence-transformers уже исключены из этой ревизии — backend стартует чисто). `python-socketio==5.16.1` присутствует.
4. Frontend deps: `yarn install` (lockfile регенерирован, `expo-audio` восстановлен).
5. `EMERGENT_LLM_KEY` (Universal Key) + `CORS_ORIGINS="*"` добавлены в `backend/.env`.
6. `sudo supervisorctl restart backend expo`; smoke-чек 200 OK на всём.

---

## 2. Smoke-результаты (live, 2026-05-28)

| Тест | Результат |
|---|---|
| `GET /api/healthz` | 200 — `{"status":"ok"}` |
| `GET /api/web-ui/` (CRA bundle) | 200 — HTML отдаётся |
| `POST /api/auth/login` admin/admin123 | 200 — `role=admin` |
| `POST /api/auth/login` john/dev123 | 200 — `role=developer` |
| `POST /api/auth/login` client/client123 | 200 — `role=client` |
| `POST /api/auth/login` tester/tester123 | 200 — `role=tester` |
| `GET /api/auth/me` (client cookie) | 200 — `email=client@atlas.dev` `role=client` |
| `GET /api/contracts/my` (client) | 200 — `items=[]` (контракты появятся при подписании) |
| `GET /api/client/invoices` (client) | 200 — 6 demo-инвойсов |
| `GET /api/admin/users?limit=3` (admin) | 200 — RBAC соблюдён |
| `GET /api/integrations/manifest` | 200 — все capabilities помечены mock/dormant/unavailable |
| Expo Welcome (через tunnel) | 200 — рендерит EVA-X / "Build real products. Not tasks." / SEQ-01/02/03 |
| OpenAPI routes (total) | **732** |

### Фоновые циклы (живые, подтверждено в `backend.err.log`)

- **PAY-V2:** worker (5s) / reaper (30s) / mock advancer (5s) / scheduler (900s) / reconciler (1800s — первая итерация прошла, 0 расхождений).
- **Guardian** (120s)
- **Module Motion** (15s)
- **Operator scheduler** (300s)
- **Event engine** (15 min)
- **Contract Reminder** (21600s = 6h)
- **Auto-Balancer** (кругом по 2 мин — уже отчитался `overloaded=0 priority=0 moves=0`).

---

## 3. Архитектура репозитория

### 3.1 Backend (`/app/backend`, ~28K LOC в `server.py` + 96 модулей)

**Доменные слои:**
- **Auth:** `auth_otp.py`, `two_factor.py`, `google_auth.py`, cookie-сессия в `server.py`.
- **Деньги:** `money_bridge.py`, `money_ledger.py`, `money_runtime.py`, `money_projections.py`, `money_divergence.py`, `money_replay.py`, `client_escrow.py`, `escrow_layer.py`.
- **Payouts V2 (sealed P0+P1+P2A+P3+P4+P5):** `payouts_v2.py`, `payouts_v2_api.py`, `payouts_v2_worker.py`, `payouts_v2_reconciler.py`.
- **Назначения / QA / Approvals:** `assignment_engine.py`, `acceptance_layer.py`, `qa_layer.py`, `client_acceptance.py`, `decision_layer.py`.
- **Контракты и юридика (sealed P3..P8):** `legal_contract_layer.py`, `client_costs.py`, `client_transparency.py`.
- **Команда / разработчики:** `team_api.py`, `team_layer.py`, `team_intelligence.py`, `developer_brain.py`, `developer_economy.py`, `developer_intelligence.py`, `developer_support.py`.
- **Операторская / клиентская:** `client_workspace.py`, `client_operator.py`, `client_operator_opportunities.py`, `operator_engine.py`.
- **Админ-кабинеты:** `admin_actions.py`, `admin_control.py`, `admin_integrations.py`, `admin_llm_settings.py`, `admin_mobile.py`, `admin_production.py`, `admin_risk.py`, `admin_system.py`, `admin_team.py`, `admin_users_layer.py`.
- **Интеллект / автоматизация:** `intelligence_api.py`, `intelligence_layer.py`, `autonomy_api.py`, `autonomy_layer.py`, `execution_intelligence.py`, `decomposition_engine.py`, `pricing_engine.py`, `scaling_engine.py`, `revenue_brain.py`, `competitor_analyzer.py`.
- **Интеграции:** `integrations_api.py`, `cloudinary_service.py`, `email_service.py`, `stt_service.py`, `push_sender.py`, `integrations/`, `payment_providers/`.
- **Прочее:** `event_engine.py`, `flow_control.py`, `module_execution.py`, `module_motion.py`, `time_tracking_layer.py`, `validation_campaigns.py`, `funnel_events.py`, `hidden_ranking.py`, `reputation_decay.py`, `mobile_adapter.py`, `compat_routes.py`, `etap3_routes.py`, `web_p4_summaries.py`, `system_truth.py`.

**Контракты:** `backend/CONTRACTS.md` фиксирует runtime-инварианты.

### 3.2 Mobile (`/app/frontend/app`, 100 файлов `.tsx`)

11 ролевых веток + корневые экраны:
- **Root:** `welcome.tsx`, `auth.tsx`, `index.tsx`, `gateway.tsx`, `hub.tsx`, `account.tsx`, `profile.tsx`, `settings.tsx`, `inbox.tsx`, `chat.tsx`, `documents.tsx`, `activity.tsx`, `voice-demo.tsx`, `work.tsx`.
- **Estimate flow:** `describe.tsx`, `estimate-improve.tsx`, `estimate-result.tsx`, `project-booting.tsx`.
- **2FA:** `two-factor-challenge.tsx`, `two-factor-setup.tsx`, `two-factor-recovery.tsx`.
- **Ветки по ролям:** `admin/`, `developer/`, `client/`, `operator/`, `tester/`, `lead/`, `portfolio/`, `project/`, `contract/`, `help/`, `workspace/`.
- Layout-prewarm иконок сохранён в `_layout.tsx`.

### 3.3 Web admin (`/app/web`, 53 страницы)

CRA-приложение с собственной темой, билд лежит в `web/build/` и проксируется backend'ом под `/api/web-ui/`. См. `web/ARCHITECTURE.md`.

### 3.4 Packages (`/app/packages`)
- `design-system/` — общий набор примитивов / токенов.
- `runtime-client/` — обвязка для рантайм-вызовов из mobile/web (token-prime, telemetry, retry).

### 3.5 Документы / память
- `docs/` — чартеры аудитов (operational-graft / hardening / probe / scope-freeze / synthetic findings 100+).
- `audit/` — артефакты предыдущих run'ов (baseline / heatmap / parity / pr0 / run1_pre_graft / run2_post_graft, ~85 файлов).
- `memory/PRD.md` (обновлён в этой сессии), `memory/test_credentials.md` (обновлён), `memory/memory/active_issues.md`.

---

## 4. Состояние интеграций (`/api/integrations/manifest`)

| Capability | Mode | Что включает live |
|---|---|---|
| payment (Stripe) | **mock** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| paypal | **dormant** | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` |
| mail (Resend) | **mock** | `RESEND_API_KEY` |
| storage (Cloudinary) | **mock** | `CLOUDINARY_CLOUD_NAME` + `_API_KEY` + `_API_SECRET` |
| oauth (Google) | **unavailable** | `GOOGLE_CLIENT_ID` |
| sentry | **dormant** | `SENTRY_DSN` |
| ai (Emergent LLM) | **mock в manifest, key установлен** | `EMERGENT_LLM_KEY` — ✅ установлен (Universal Key) |
| settlement | **mock** | парные Stripe Connect + PayPal Payouts ключи |

Манифест честный: UI/моб увидит реальный режим без ложных обещаний.

---

## 5. Tech debt / находки

| # | Серьёзность | Находка | Где | Рекомендация |
|---|---|---|---|---|
| 1 | low | 9 предупреждений FastAPI о дублирующихся Operation ID | `admin_users_layer.py` (audit_log, list_users_v2, get_user_detail, block_user, unblock_user, change_role, logout_all, soft_delete) + дубль из `validation_campaigns.py` | Указать уникальные `operation_id=` в `APIRouter` декораторах либо переименовать функции. |
| 2 | low | `sentence_transformers` лениво используется в эмбеддинге scope-template'ов, но не входит в требования — 4 ошибки на старте, шаблоны при этом сидируются | `backend/server.py` (один блок lazy import) | Если векторный поиск шаблонов нужен — добавить пакет; если нет — заглушить лог. |
| 3 | medium | `yarn.lock` не в гите (regenerated при инсталле) | `frontend/` | Закоммитить `yarn.lock` для детерминированной сборки. |
| 4 | info | `EMERGENT_LLM_KEY` установлен в этой сессии — работает для OpenAI/Anthropic/Gemini text + Nano Banana + Whisper | `backend/.env` | Готово. Для других LLM-фич нужны соответствующие ключи. |
| 5 | info | Manifest интеграций возвращает `policy=hard` для payment & oauth — клиентские флоу останутся в mock до подключения реальных ключей | `backend/integrations_api.py` | Это правильно; UI уже показывает demo-mode баннеры. |
| 6 | info | Heavy backend: `server.py` ~27 883 строки — кандидат на дальнейшую декомпозицию | `backend/server.py` | Не блокер; продолжать выносить роуты в доменные модули по мере касания. |

**Web-side предупреждения (не блокеры):** `"Invalid borderColor"`, `"shadow*"`, `"pointerEvents"` deprecated — это pre-existing шум от react-native-web 0.21 с устаревшими паттернами в стилях. UI рендерится корректно.

---

## 6. Тест-учётки (актуальны после сидинга)

См. `/app/memory/test_credentials.md`.

| Роль | Email | Пароль |
|---|---|---|
| admin | admin@atlas.dev | admin123 |
| developer | john@atlas.dev | dev123 |
| client | client@atlas.dev | client123 |
| tester | tester@atlas.dev | tester123 |

Эндпоинт: `POST /api/auth/login` → JSON `{email, password}` → 200 OK + `httpOnly` session cookie.

---

## 7. Что готово для следующего шага

- Бэкенд + Метро + MongoDB зелёные. Все 732 роута зарегистрированы, все фоновые циклы крутятся.
- Mobile Welcome рендерится, deep links на 11 ролевых веток в `/app/frontend/app/`.
- Web admin раздаётся (`/api/web-ui/`).
- БД сидирована демо-данными (12 пользователей, 99 модулей, 6 инвойсов, 105 QA-решений, 3 проекта).
- Manifest интеграций "честно мокает" payment/mail/storage/oauth — реалистичный demo-режим без липовых успехов.
- `EMERGENT_LLM_KEY` подключён — AI/intelligence/autonomy слои готовы стартовать живые вызовы.

Готов продолжать. Ожидаю команду пользователя на следующий шаг. Наиболее ожидаемые направления из `memory/memory/active_issues.md`:

1. **PAY-V2 → P2B** (PayPal live activation).
2. **AI / automation pickup** (Universal Key уже есть — autonomy_layer, intelligence_layer, revenue_brain готовы).
3. **Analytics / Billing V2 / Forecasting / Growth / Referral / Operator features.**
4. **Tech-debt спринт** (Operation IDs, lock-file commit, опциональные sentence-transformers).
5. **Новая фича** — в любую сторону по запросу пользователя.
