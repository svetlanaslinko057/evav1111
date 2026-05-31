# 🔍 AUDIT — Full Redeploy `7567676YTY` (E1)

**Repo:** `svetlanaslinko057/7567676YTY` (`main`, последний коммит — auto-generated `bc94f40`)
**Session:** 2026-02-FEB (E1, чистая инициализация pod из репозитория)
**Type:** Полное развёртывание + smoke + аудит
**Базовый аудит для diff:** `audit/AUDIT_2026-05-29_REDEPLOY_76776767_E1_RU.md`

---

## 1. Сводка

| Параметр                | Значение                                                      |
|-------------------------|---------------------------------------------------------------|
| Backend файлов          | **98** `.py` в `/app/backend/*.py` (+ подпакеты)              |
| Backend LoC             | **92 350** строк                                              |
| Backend routes (declarative) | **463** (`@api_router.*` / `@app.*` в `backend/*.py`)     |
| Frontend (Expo) экранов | **100** `.tsx` в `/app/frontend/app`                          |
| Web routes              | **118** `<Route path=…>` в `/app/web/src/App.js`              |
| Mongo (`test_database`) | **44** коллекции, в т.ч. `users=12`, `projects=3`, `modules=99`, `portfolio_cases=5`, `notifications=11`, `money_ledger_events=30` |
| Background loops        | **10/10 active** (см. §6)                                     |
| Smoke API               | **9/10 OK** (`/api/system/truth` → 403, доступ только Admin)  |
| Preview (web shell)     | HTTP 200, лендинг **EVA-X** «Build real products. Not tasks.» рендерится |
| Auth                    | `admin@atlas.dev / admin123` ✅, `client@atlas.dev` quick ✅    |

---

## 2. Действия развёртывания

1. ✅ `git clone --depth=1 https://github.com/svetlanaslinko057/7567676YTY` → `/tmp/repo`. В репо: `backend/`, `frontend/`, `web/`, `packages/`, `docs/`, `audit/`, `scripts/`, `tools/`, `tests/`, `memory/`, `test_reports/`, `design_guidelines.{json,md}`.
2. ✅ Содержимое репо аккуратно «наложено» в `/app` с сохранением **protected env** (`backend/.env` — `MONGO_URL`, `DB_NAME`; `frontend/.env` — `EXPO_PACKAGER_*`, `EXPO_PUBLIC_BACKEND_URL`) и `metro.config.js`. `node_modules` сохранён (yarn install уточнил отсутствующие).
3. ✅ Backend python deps доставлены (отсутствовали в venv после холодного старта):
   `python-socketio`, `python-engineio`, `simple-websocket`, `bidict`, `litellm`, `emergentintegrations`, `pyotp`, `slowapi`, `reportlab`, `resend`, `stripe`, `boto3`, `pyjwt`, `scikit-learn`, `qrcode`, `python-jose[cryptography]`, `passlib[bcrypt]`, `python-multipart`, `email-validator`.
4. ✅ Frontend `yarn install` (yarn 1.22) — досинхронизированы expo-пакеты, заявленные в `package.json` (включая `expo-audio`, `expo-notifications`, `expo-secure-store`).
5. ✅ `supervisorctl restart backend && restart expo` → оба сервиса **RUNNING**.

### Restored from /tmp backup
| Файл                              | Источник | Зачем                                      |
|-----------------------------------|----------|--------------------------------------------|
| `/app/backend/.env`               | бэкап    | `MONGO_URL`, `DB_NAME` (protected)         |
| `/app/frontend/.env`              | бэкап    | `EXPO_PACKAGER_*`, `EXPO_PUBLIC_BACKEND_URL` (protected) |
| `/app/frontend/metro.config.js`   | бэкап    | стабильный кеш (CI), maxWorkers=2          |

---

## 3. Архитектура (актуальное состояние)

### Backend — FastAPI, port 8001, prefix `/api`
Модульный монолит. Семь функциональных слоёв (без изменений vs прошлый аудит):

* **Auth / Users:** `auth_otp.py`, `account_layer.py`, `two_factor.py`, `google_auth.py`, `admin_users_layer.py`.
* **Money / Payments (PAY-V2):** `payouts_v2*.py` (api, worker, reconciler), `money_bridge.py`, `money_ledger.py`, `money_projections.py`, `money_runtime.py`, `money_divergence.py`, `escrow_layer.py`, `escrow_api.py`, `dev_wallet_reader.py`, `pricing_engine.py`, `payment_providers/{mock,stripe,wayforpay}`.
* **Contracts / Legal:** `legal_contract_layer.py`, `legal_settings.py`, `client_acceptance.py`.
* **Execution:** `execution_intelligence.py`, `work_execution.py`, `assignment_engine.py`, `module_motion.py`, `module_execution.py`, `operator_engine.py`, `decomposition_engine.py`.
* **Team / Developer:** `team_layer.py`, `team_balancer.py`, `team_intelligence.py`, `developer_brain.py`, `developer_economy.py`, `developer_intelligence.py`, `developer_support.py`, `dev_work.py`.
* **Client:** `client_workspace.py`, `client_operator.py`, `client_transparency.py`, `client_escrow.py`, `client_costs.py`, `client_acceptance.py`, `client_operator_opportunities.py`.
* **Admin:** `admin_actions.py`, `admin_control.py`, `admin_integrations.py`, `admin_llm_settings.py`, `admin_mobile.py` (44 KB), `admin_production.py`, `admin_risk.py`, `admin_system.py`, `admin_team.py`.
* **Mobile adapter:** `mobile_adapter.py`.
* **AI / Intelligence:** `intelligence_layer.py`, `revenue_brain.py`, `competitor_analyzer.py`, `validation_campaigns.py`, `scaling_engine.py`, `decision_layer.py`.
* **Observability / Events:** `observability.py`, `event_engine.py`, `funnel_events.py`, `flow_control.py`, `system_truth.py`.
* **Integrations:** `cloudinary_service.py`, `email_service.py` (Resend), `push_sender.py`, `stt_service.py`, `integrations/` (live_adapters, mocks, settlement_{mock,paypal,stripe}, storage, mail, ai, oauth).

### Frontend — Expo SDK ~54, port 3000
* Expo Router (file-based, 100 экранов).
* Структура: `app/client/*`, `app/admin/*`, `app/developer/*`, `app/tester/*`, `app/lead/*`, `app/operator/*`, `app/help/*`, `app/portfolio/*`, `app/contract/*`, `app/workspace/*`.
* Provider stack (`_layout.tsx`): `AuthProvider → AuthGateProvider → FeedbackProvider → StateShiftProvider → ValidatorProvider → I18nProvider → ThemeProvider → OnboardingTourProvider`. Прогрев иконных шрифтов сохранён.
* Runtime client: `src/runtime`, `src/runtime-client` — backend-driven capabilities (Stage 6.2 boot guard, 1.5s race с soft-degraded fallback).

### Web — CRA (React 18 + Tailwind), `/app/web`
* 118 маршрутов, ключевые: `/`, `/describe`, `/estimate-result`, `/auth`, `/admin/login`, `/client/*` (dashboard-os, billing-os, contract, workspace, deliverables, support, projects, …), `/builder/*`, `/admin/*`.
* Pre-built bundle лежит в `web/build/` (отдаётся либо CRA dev, либо как статика FastAPI / CDN).

### Packages
* `packages/design-system` — общие токены / компоненты.
* `packages/runtime-client` — типобезопасный SDK к backend (capabilities, manifest).

### Database — MongoDB `test_database`
44 коллекции; ключевые seed-данные (после `mock_seed.py`):

| Коллекция            | Count | Примечание                          |
|----------------------|-------|-------------------------------------|
| `users`              | 12    | admin, dev × 8, client, tester, multi |
| `projects`           | 3     | Acme Analytics, Mobile App, …      |
| `modules`            | 99    | Декомпозиция templates × projects  |
| `portfolio_cases`    | 5     | Fintech, e-commerce, …             |
| `qa_decisions`       | 105   | Pre-seeded QA history              |
| `system_actions_log` | 51    | Engine activity                    |
| `money_ledger_events`| 30    | Demo financial flow                |
| `notifications`      | 11    | Per-user demo                      |
| `validation_tasks`   | 5     | Tester seed                        |
| `cognition_overrides`| 34    | A/B rules                          |

---

## 4. Smoke-тест API (live)

| Endpoint                                       | Метод | Auth          | Result | Code |
|------------------------------------------------|-------|---------------|--------|------|
| `/api/healthz`                                 | GET   | none          | `{"status":"ok"}` | 200 |
| `/api/stats`                                   | GET   | none          | 3 projects / 1 client / 8 devs | 200 |
| `/api/portfolio/featured`                      | GET   | none          | 3 кейса (Fintech, …)            | 200 |
| `/api/auth/login` (admin@atlas.dev / admin123) | POST  | none → cookie | full user payload                | 200 |
| `/api/auth/quick` (client@atlas.dev)           | POST  | none → cookie | user + isNew=false               | 200 |
| `/api/auth/me`                                 | GET   | cookie        | client user payload              | 200 |
| `/api/projects/mine`                           | GET   | cookie        | 3 projects                       | 200 |
| `/api/notifications/my`                        | GET   | cookie        | 2 notifications                  | 200 |
| `/api/system/truth`                            | GET   | client cookie | "forbidden" (Admin-only)         | 403 |
| `/api/capabilities`, `/api/runtime/capabilities`| GET  | n/a           | not exposed — runtime client использует `/api/integrations/manifest` (видно в backend.out.log, 200 OK) | 404 |

> **Итог:** 9 из 10 ожидаемо зелёных. 403 на `/api/system/truth` — корректное поведение RBAC (только admin). `/api/capabilities` отсутствует как явный endpoint, но манифест runtime отдаётся через `/api/integrations/manifest` (рабочий, видно из логов).

---

## 5. Frontend live

* Preview URL: `https://expo-web-mobile-1.preview.emergentagent.com` → HTTP 200, бандл собран (Metro: `Web Bundled 2824ms node_modules/expo-router/entry.js (1563 modules)`).
* Скриншот: лендинг EVA-X с заголовком **«Build real products. Not tasks.»**, sequence-блоком SEQ-01…03 и USP-чек-листом — рендерится корректно.
* Console logs: единственные warnings — `[expo-notifications] Listening to push token changes is not yet fully supported on web` (ожидаемо для веб-превью).

---

## 6. Background workers / loops

| Имя                       | Файл                       | Интервал |
|---------------------------|----------------------------|----------|
| EVENT ENGINE scanner      | `server.py` + `event_engine.py` | 15 min |
| PAY-V2 worker             | `payouts_v2_worker.py`     | 5 s     |
| PAY-V2 mock advancer      | `payouts_v2_worker.py`     | 5 s (delay 2 s) |
| PAY-V2 reaper             | `payouts_v2_worker.py`     | 30 s    |
| PAY-V2 api scheduler      | `payouts_v2_api.py`        | 900 s   |
| AUTO GUARDIAN loop        | `auto_guardian.py`         | 120 s   |
| MODULE MOTION loop        | `module_motion.py`         | 15 s    |
| CONTRACT REMINDER loop    | `legal_contract_layer.py`  | 21600 s |
| OPERATOR SCHEDULER        | `operator_engine.py`       | 300 s   |
| RECONCILE LOOP            | `payouts_v2_reconciler.py` | 1800 s  |

В первой минуте после старта зафиксированы корректные циклы:
* `auto_guardian: OPERATOR auto_project_pause project=969ce2c3 paused=1`
* `team_balancer: AUTO_BALANCER cycle complete — overloaded=0 priority=0 moves=0`
* `payouts_v2_reconciler: RECONCILE run=… scanned=0 discrepancies=0 critical=0`

Никаких ERROR/Traceback в стартапе после фиксов deps (см. §7).

---

## 7. Что было сломано на старте и что починили

| Источник              | Симптом                                          | Действие |
|-----------------------|--------------------------------------------------|----------|
| `requirements.txt` vs venv | `ModuleNotFoundError: socketio / qrcode / passlib[bcrypt] / jose` | `pip install` точечно (см. §2 шаг 3). Venv `/root/.venv` не реинициализировался автоматически. |
| Expo                  | `PluginError: Failed to resolve plugin for module "expo-audio"` | `yarn install` подтянул отсутствующие native-плагины. |
| Embeddings            | `Embedding error … No module named 'sentence_transformers'` (4 шаблона) | **WARNING only**, не блокирует startup. Возможно поставить `sentence-transformers` если semantic seed нужен. |
| Resend                | `RESEND_API_KEY not set — email delivery disabled` | INFO/WARN. Email mock-mode (так и задумано в dev). |
| Stripe / PayPal       | `STRIPE_API_KEY missing / PAYPAL_CLIENT_ID missing` | DORMANT adapters (так и задумано в dev). |

---

## 8. Расхождения с прошлым аудитом

| Поле                | `76776767` (29 May)   | `7567676YTY` (FEB)   | Комментарий |
|---------------------|-----------------------|----------------------|-------------|
| Backend modules     | 98 + subpackages      | 98 + subpackages     | без изменений |
| Backend routes      | 741                   | **463**              | падение метрики связано с подсчётом: 741 = декларации + sub-routers, 463 — только `@api_router.*` / `@app.*` в `backend/*.py`. Реальное количество в include_router всё ещё близко к 700 (`server.py` агрегирует payouts_v2_api, web_p4_summaries, etap3_routes, escrow_api, autonomy_api, intelligence_api, team_api, integrations_api, admin_*, …). Стоит зафиксировать единую методику подсчёта. |
| Web routes          | n/a (web/ отсутствовал в `76776767`) | **118** | `web/` восстановлен — текущий репо снова **full triple-platform**. |
| Background loops    | 10/10                 | 10/10                | без изменений |
| Frontend screens    | ~95                   | **100**              | +5 (см. §9) |
| docs/ packages/ tools/ scripts/ | отсутствовали | присутствуют | репо полное |

---

## 9. Mobile (Expo) — карта новых/ключевых экранов

Group / Route                              | Назначение
-------------------------------------------|----------------------------------------
`app/welcome.tsx`, `app/auth.tsx`          | Onboarding / login
`app/hub.tsx`, `app/inbox.tsx`             | Стартовая, единый inbox
`app/describe.tsx`, `app/estimate-result.tsx`, `app/estimate-improve.tsx` | Lead → scope → price funnel
`app/project-booting.tsx`                  | UX между оплатой и стартом разработки
`app/client/*` (17)                        | Полный клиентский кабинет
`app/admin/*` (13)                         | Operational cockpit (alerts, QA, payouts, integrations, profile)
`app/developer/*`                          | Workbench разработчика
`app/tester/*`                             | Validation flows (Stage 4 — `product-scope-freeze.md`)
`app/lead/*`, `app/operator/*`             | Lead-pipeline / operator hints
`app/two-factor-{challenge,setup,recovery}.tsx` | 2FA
`app/voice-demo.tsx`                       | TTS / STT demo

Сохранены контрактные ограничения: Expo admin = **operational cockpit only**, не парирует web admin (см. `docs/product-scope-freeze.md`).

---

## 10. Чек-лист соответствия Emergent policies

| Правило                                                    | Статус |
|------------------------------------------------------------|--------|
| `backend/.env: MONGO_URL` не модифицирован                 | ✅ |
| `frontend/.env: EXPO_PACKAGER_*` не модифицированы         | ✅ |
| `metro.config.js` не трогали (восстановлен из бэкапа)      | ✅ |
| `_layout.tsx` icon-font prewarming сохранён               | ✅ |
| Все backend routes префиксованы `/api/...`                 | ✅ (api_router prefix=`/api`) |
| MongoDB ответы исключают `_id`                             | ✅ (проверено на 4 endpoint-ах) |
| `/app/memory/test_credentials.md` обновлён                 | ✅ |

---

## 11. Что НЕ работает / TODO (для будущих сессий)

1. **`sentence-transformers` не установлен** — 4 scope-templates стартуют без embeddings (warning). Не блокер, но семантический поиск шаблонов недоступен.
2. **Stripe / PayPal / Resend / Cloudinary** — все DORMANT (нет ключей). При выходе на production нужны реальные ключи.
3. **`/api/system/truth`** требует admin-cookie. Если фронт-runtime обращается без admin-role — fallback должен быть мягким (проверить `src/system-truth.tsx`).
4. **`/api/capabilities` отдаёт 404** — runtime использует `/api/integrations/manifest`. Если где-то в коде остался legacy путь — поправить.
5. **EMERGENT_LLM_KEY** не задан в `backend/.env` (sentinel placeholder). Для AI-фич нужно прописать.
6. **Унификация методики подсчёта routes** — внести в `audit/ENDPOINT_FAMILY_REGISTRY.md` единый счётчик (декларации vs сборные include_router'ы), чтобы аудиты не расходились.

---

## 12. Готовность к следующему шагу

* ✅ Backend up на 8001 (HTTP 200 `/api/healthz`).
* ✅ Expo up на 3000, тоннель ready.
* ✅ Web preview рендерится (HTTP 200, EVA-X landing).
* ✅ MongoDB seeded (12 users, 3 projects, 99 modules, …).
* ✅ Auth flows работают (login admin/client, cookies).
* ✅ Background loops `10/10`.
* ✅ Test credentials записаны в `/app/memory/test_credentials.md`.

> Развёртывание завершено, **ничто не блокирует продолжение разработки** на trio (web + Expo + backend).
> Готов взять следующую задачу — экраны Expo, web-флоу или backend-фича.

— E1, 2026-02-FEB
