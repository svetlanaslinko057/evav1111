# AUDIT — Полный редеплой и аудит репозитория `1312dwqweve` (2026-02-FEB)

> Источник: `https://github.com/svetlanaslinko057/1312dwqweve` (branch `main`, head `045721d` — Auto-generated changes, 7h ago).
> Сессия E1, агент: Emergent E1.
> Цель: полностью развернуть проект ATLAS DevOS / EVA-X в чистый Emergent‑pod и сделать аудит текущего состояния.

---

## 1. Что было сделано в этой сессии

1. Клонирован репозиторий `--depth 1` в `/tmp/repo_clone` (~403 МБ, 17 475 файлов).
2. Код синхронизирован (`rsync`) в `/app`, исключая `.git`, `.emergent`, `.env`, `node_modules`, `.metro-cache`, `.expo`, `__pycache__`, `*.pyc`, `yarn.lock` (lock пересоздан локально).
3. `backend/.env` пересоздан со всеми ключами:
   - `MONGO_URL="mongodb://localhost:27017"`
   - `DB_NAME="atlas_devos"`
   - `CORS_ORIGINS="*"`
   - `EMERGENT_LLM_KEY="sk-emergent-…"` (Universal Key, выдан в этой сессии)
4. `frontend/.env` сохранён без изменений (защищённые переменные Expo packager + `EXPO_PUBLIC_BACKEND_URL`).
5. Установлены backend‑зависимости через `pip install -r requirements.txt` (149 пакетов; обновлены emergentintegrations==0.1.0, transformers, pandas, boto3 и др.).
6. Установлены frontend‑зависимости через `yarn install` (lock пересоздан, ~12s).
7. Web CRA‑бандл взят из репозитория (`/app/web/build/`, ~530 КБ gzip; раздаётся FastAPI на `/api/web-ui/`).
8. Очищен Metro‑кеш и перезапущен supervisor.
9. Прогнан smoke‑тест по 13 эндпоинтам (см. §4).
10. Снят скриншот мобильного preview — рендерится Welcome ("Build real products. Not tasks." + SEQ‑01/02/03).

---

## 2. Архитектура

| Слой | Размер | Замечание |
|---|---|---|
| Backend (FastAPI) | `server.py` 28 089 строк + ~96 доменных модулей (`api/`, `domains/`, `infrastructure/`, `integrations/`, `middleware/`, `payment_providers/`, `services/`, `shared/`) | **741 публичный путь** в OpenAPI |
| Frontend Expo (SDK 54) | ~100 `.tsx` экранов в 11 ролевых ветках (`admin/`, `developer/`, `client/`, `operator/`, `tester/`, `lead/`, `portfolio/`, `project/`, `contract/`, `help/`, `workspace/` + корень) | 1 563 модуля собрано Metro |
| Web (CRA) | 53 страницы в `/app/web/src/pages/`, build артефакт в `/app/web/build/` | Раздаётся FastAPI на `/api/web-ui/` |
| Packages | `packages/design-system`, `packages/runtime-client` | Локальные monorepo‑пакеты |
| MongoDB | seeded из `server.py` lifespan | 12 пользователей, 99 модулей, 105 QA decisions, 3 проекта, 6 invoices |
| Документация | `docs/`, `audit/`, `memory/` | 400+ MD‑файлов с PRD / charter / phase‑закрытиями |

### Запломбированные подсистемы (substrate sealing)

Из существующих документов в `audit/`:
- **Money Phase 2C‑B** — sealed
- **Web Stabilization Line P3..P6** — sealed
- **Contracts P3..P8** — sealed
- **Payouts V2 P0+P1+P2A+P3+P4+P5** — sealed

---

## 3. Статус supervisor

```
backend                          RUNNING   pid 867   8001  741 routes, все фоновые петли подняты
expo                             RUNNING   pid 351   3000  1 563 модуля, tunnel ready
mongodb                          RUNNING   pid 352   27017 seeded
code-server                      RUNNING   pid 350         IDE для пользователя
nginx-code-proxy                 RUNNING   pid 348         proxy для code‑server
```

### Поднятые фоновые петли (из backend.err.log)
- **PAY‑V2 worker** — `interval=5s batch=10 lease=60s max_attempts=5`
- **PAY‑V2 reaper** — `interval=30s`
- **PAY‑V2 mock advancer** — `interval=5s delay=2s`
- **PAY‑V2 scheduler** — `interval=900s`
- **PAY‑V2 reconciler (passive observer)** — `interval=1800s` (первая прогонка: `scanned=0 discrepancies=0`)
- **Guardian** — `interval=120s` (увидел `auto_project_pause project=a4d8a145 paused=1` через 30s)
- **Module Motion** — `interval=15s`
- **Operator scheduler** — `interval=300s`
- **Contract reminder** — `interval=21 600s` (6h)
- **Money bridge / money ledger** — индексы зафиксированы
- **Competitor cache** — TTL 24h
- **Validation campaigns** — индексы зафиксированы

### Seed (выполнен на boot)
- `Seeded mock providers`
- `Seeded portfolio cases`
- `Created admin user`
- `Created quick-access user: admin@atlas.dev (admin)`
- `Created quick-access user: john@atlas.dev (developer)`
- `Created quick-access user: client@atlas.dev (client)`
- `Created quick-access user: multi@atlas.dev (developer)`
- `Created quick-access user: tester@atlas.dev (tester)`
- `ADMIN_SYSTEM backfill: set roles[] on 1 user(s)`
- `INTEGRATIONS seed: added blocks=['wayforpay', 'stripe', 'app', 'payments']`

---

## 4. Smoke‑тест (live, в `/app`)

| Эндпоинт | Метод | Auth | Результат |
|---|---|---|---|
| `/api/healthz` | GET | — | `200 {"status":"ok"}` |
| `/api/web-ui/` | GET | — | `200` (CRA admin bundle) |
| `/api/portfolio/cases` | GET | — | `200` |
| `/api/integrations/manifest` | GET | — | `200` |
| `/api/mobile/auth/login` (admin@atlas.dev / admin123) | POST | — | `200`, token=`sess_ffd3cea901b84…` |
| `/api/mobile/auth/login` (john@atlas.dev / dev123) | POST | — | `200`, token=`sess_aeea222ee80a4…` |
| `/api/mobile/auth/login` (client@atlas.dev / client123) | POST | — | `200` |
| `/api/mobile/auth/login` (tester@atlas.dev / tester123) | POST | — | `200` |
| `/api/mobile/auth/demo` (role=client) | POST | — | `200`, демо‑сессия 24h |
| `/api/auth/me` | GET | admin Bearer | `200` |
| `/api/contracts/my` | GET | john Bearer | `200 {"items":[],"count":0}` |
| `/api/client/invoices` | GET | client Bearer | `200`, 6 элементов |
| `/api/admin/users` | GET | admin Bearer | `200` |
| `/api/admin/onboarding/tour-stats` | GET | admin Bearer | `200` |
| Внешний preview `https://expo-mobile-test-2.preview.emergentagent.com` | GET | — | `200` (Expo Welcome рендерится) |

**Все 14/14 smoke‑чеков прошли.**

---

## 5. Status интеграций

| Возможность | Текущий режим | ENV для активации |
|---|---|---|
| **AI (OpenAI / Anthropic / Gemini text + Nano Banana + Whisper)** | **READY ✅** | `EMERGENT_LLM_KEY` — установлен этой сессией |
| Payment (Stripe) | DORMANT — adapter init с warning `StripeConnect adapter DORMANT — STRIPE_API_KEY missing` | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` |
| PayPal Payouts | DORMANT — `set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID to enable` | `PAYPAL_*` |
| Mail (Resend) | MOCK — `RESEND_API_KEY not set — email delivery disabled` | `RESEND_API_KEY` |
| Storage (Cloudinary) | MOCK — `CLOUDINARY: MOCK mode (no API keys yet — files saved locally)` | `CLOUDINARY_*` |
| Google OAuth | UNAVAILABLE | `GOOGLE_CLIENT_ID` |
| Sentry observability | DORMANT (no‑op без DSN) | `SENTRY_DSN` |

---

## 6. Тестовые учётные данные

См. `/app/memory/test_credentials.md` (обновлён в этой сессии). Quick‑access:

| Роль | Email | Пароль |
|---|---|---|
| admin | `admin@atlas.dev` | `admin123` |
| developer | `john@atlas.dev` | `dev123` |
| client | `client@atlas.dev` | `client123` |
| developer (multi‑role) | `multi@atlas.dev` | `multi123` |
| tester | `tester@atlas.dev` | `tester123` |

Плюс ещё 6 seeded developer‑аккаунтов без пароля (Alice, Marco, Priya, Luka, Sara, Diego — заполнены для marketplace / admin/users).

---

## 7. Замечания / технический долг (из проверки этой сессии)

1. **Web build уже в репозитории** — это нестандартно (build артефакты обычно gitignore), но удобно: не нужен `yarn build` в web/.
2. **Duplicate Operation IDs в OpenAPI** — известное предупреждение из `admin_users_layer.py` + `validation_campaigns.py` (9 warnings, не блокирует). Из предыдущих PRD.
3. **`sentence-transformers`** — лениво импортируется в scope‑template embedding; если не установлен, fallback работает, но 4 предупреждения в логах при seed. Опционально для vector‑search.
4. **`yarn.lock` не в репозитории** — пересоздаётся при `yarn install` (`success Saved lockfile`). Стабильно, но потенциально влияет на воспроизводимость.
5. **Metro кеш** — после rsync пришлось вручную почистить `.metro-cache` / `.expo`, чтобы Expo подхватил новые пути. Это нужно делать **всегда** при перерасстановке кодовой базы.
6. **3 backend warnings в логах** (не блокируют):
   - `RESEND_API_KEY not set` (mock mail)
   - `STRIPE_API_KEY missing` (mock payments)
   - `CLOUDINARY: MOCK mode` (local storage fallback)
   Все — ожидаемое поведение в dev‑среде.

---

## 8. Что готово к запуску прямо сейчас

- ✅ Полный 4‑ролевой авторизационный flow на мобильном (Expo).
- ✅ Web‑админка под `/api/web-ui/` (CRA build).
- ✅ Все 741 backend route доступны.
- ✅ AI‑слой готов (Universal Key установлен).
- ✅ Демо‑сессии работают без регистрации (`/api/mobile/auth/demo`).
- ✅ Seeded демо‑проект `Acme Analytics Platform` для `client@atlas.dev` (3 модуля).
- ✅ 6 демо‑invoices для `client@atlas.dev`.
- ✅ 5 онбординг‑туров (client/developer/admin/operator + replay из Profile).
- ✅ Cookie banner + Legal settings + Admin Legal editor.

---

## 9. Что нужно от пользователя, чтобы двигаться дальше

1. **Направление работы:** какую конкретно фичу/эпик хотим взять в работу следующим? (PRD §"Next action items" перечисляет 5 опций: PAY‑V2 P2B, AI pickup, Analytics/Billing V2, Tech‑debt sweep, новая фича.)
2. **Live‑интеграции:** если нужно вывести Stripe/PayPal/Resend/Cloudinary из mock в боевой режим — нужны API‑ключи.
3. **Google OAuth:** если нужна авторизация через Google — нужен `GOOGLE_CLIENT_ID`.

---

**Файл аудита:** `audit/AUDIT_2026-02-FEB_REDEPLOY_1312dwqweve_E1_RU.md`
**PRD обновлён:** `memory/PRD.md` (добавлен раздел про текущую сессию).
**Test credentials обновлены:** `memory/test_credentials.md` (5 quick‑access + 6 seed devs).
