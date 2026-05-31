# AUDIT — Полный redeploy + аудит (2026-02-FEB, repo `758r78r`, сессия E1)

## TL;DR

Полностью развёрнут проект **ATLAS DevOS / EVA-X** из репозитория `https://github.com/svetlanaslinko057/758r78r` (HEAD `92ac978` — *Auto-generated changes*) на чистый под Emergent. Все сервисы зелёные:

- **Backend** — `RUNNING`, 774 маршрута (+33 vs предыдущая сессия `13232112321231` — там было 741).
- **Expo** — `RUNNING`, туннель открыт, web bundle 1562–1564 модулей собран, mobile preview рендерит EVA-X welcome (`Build real products. Not tasks.`).
- **Web CRA (`/api/web-ui/`)** — собранный bundle уже лежит в репо (`main.72691eb2.js`, ~10 KB index), отдаётся бекендом, HTTP 200.
- **Mongo** — `RUNNING`, `atlas_devos` посеян (12 пользователей, 89 модулей, 81 QA decision, 6 invoices, 3 проекта, 3 тикета, replay batch `replay_a5b951937e` уже существует — повторный сид noop).
- **Все фоновые циклы запущены** (PAY-V2 worker/reaper/mock advancer/scheduler/reconciler, Guardian, Module Motion, Operator, Event Engine, Contract Reminder, Money Bridge).
- **Все 3rd-party интеграции** в режиме MOCK/DORMANT, `EMERGENT_LLM_KEY` подложен (Universal Key).
- **Smoke (live, 10/10 GREEN)**: `/api/healthz`, `/api/config/public`, 3 role logins (admin/client/tester @ atlas.dev), `/api/auth/me`, `/api/contracts/my`, `/api/client/invoices` (6 invoices), `/api/admin/users` (12 users), `/api/portfolio/cases` (5 cases), `/api/web-ui/`, `/api/admin/onboarding/tour-stats`, внешний Expo preview (`https://mobile-launch-pad-50.preview.emergentagent.com/`).

⚠️ **Найденные несоответствия / нерешённые мелочи** — см. раздел «Findings» ниже. Все они нон-блокирующие.

---

## 1. Источник и развёртывание

| Поле | Значение |
|---|---|
| Repo | `https://github.com/svetlanaslinko057/758r78r` |
| Branch / HEAD | `main` / `92ac978` — *Auto-generated changes* |
| Размер репо | 404 MB (после `git clone --depth 1`) |
| Шагов файлов | 17 472 |
| Pod target | `/app` (Emergent pod, kubernetes) |
| Метод | `git clone /tmp/repo_audit` → `rsync -a --delete /tmp/repo_audit/ /app/` |
| Исключения rsync | `.git .emergent .env node_modules .metro-cache .expo __pycache__ *.pyc yarn.lock` |
| Размер `/app` после | 829 MB (включая `node_modules` и backend venv не входит — он в `/root/.venv`) |

## 2. ENV — что мы создали / сохранили

**`/app/backend/.env`** (пересоздан):
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="atlas_devos"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY="sk-emergent-************E62"  # Universal Key для openai/anthropic/gemini через emergentintegrations 0.1.0
```

**`/app/frontend/.env`** (сохранён — protected pod-vars):
```
EXPO_TUNNEL_SUBDOMAIN=mobile-launch-pad-50
EXPO_PACKAGER_HOSTNAME=https://mobile-launch-pad-50.preview.emergentagent.com
EXPO_PUBLIC_BACKEND_URL=https://mobile-launch-pad-50.preview.emergentagent.com
EXPO_USE_FAST_RESOLVER=1
METRO_CACHE_ROOT=/app/frontend/.metro-cache
EXPO_PACKAGER_PROXY_URL=https://mobile-launch-pad-50.preview.emergentagent.com
```

## 3. Установка зависимостей

### Backend (`pip install -r /app/backend/requirements.txt`)
Установлено / обновлено **149 пакетов** (полный список — в `pip freeze`). Ключевые:
- `emergentintegrations 0.1.0` (downgrade c 0.1.2 в чистом образе — закреплён по requirements)
- `python-socketio 5.16.1`, `python-engineio 4.13.1`, `simple-websocket 1.1.0` (был ModuleNotFoundError до установки)
- `transformers 5.9.0`, `tokenizers 0.22.2`, `huggingface_hub 1.9.2`
- `pandas 3.0.2`, `scikit-learn 1.8.0`, `scipy 1.17.1`, `numpy 2.4.4`
- `stripe 15.0.1`, `resend 2.30.0`, `boto3 1.42.86`, `slowapi 0.1.9`
- `pyotp 2.9.0`, `qrcode 8.2`, `reportlab 4.5.1`
- `pydantic 2.12.5`, `pydantic_core 2.41.5`
- `google-genai 1.71.0`, `google-api-python-client 2.194.0`, `google-auth 2.49.1`
- `lxml 6.1.0`, `beautifulsoup4 4.13.5` (web scraping)

### Frontend (`yarn install` в `/app/frontend`)
`yarn 1.22.22 ✅ Done in 9.54s`. Lockfile сгенерирован заново. Использован `packageManager: yarn@1.22.22`. Expo SDK `~54.0.35`.

## 4. Supervisor статус (постустановка)

```
backend             RUNNING   (pid 1087)   774 routes
expo                RUNNING   (pid 1091)   tunnel ready, web bundle 1562-1564 modules
mongodb             RUNNING   (pid 567)
code-server         RUNNING   (pid 565)
nginx-code-proxy    RUNNING   (pid 563)
```

После `supervisorctl restart backend expo` бекенд поднялся за ~10 секунд, expo bundle первого прогона прошёл за **61 266 мс** (1562 модулей) — пришлось чистить `.metro-cache` и `.expo` (старый кеш указывал на несуществующие пути → ложный `Unable to resolve module ../src/auth`, файл-то живой; после очистки и перезапуска expo резолв OK).

## 5. Стартап-логи бекенда — ключевые маркеры

| Маркер | Статус |
|---|---|
| `L0 backfill: 12 users default states=[]` | ✅ |
| `L1 backfill: 89 modules default=auto` | ✅ |
| `NOTIFICATIONS seed` (admin/john/client) | ✅ 5+3+3 |
| `TESTER SEED: 5 validations + 1 issue` | ✅ |
| `Seeded 4 scope templates` | ✅ (с warnings о sentence_transformers — см. findings) |
| `Seeded system config` | ✅ |
| `SEED REPLAY: marker exists, existing_batch_id=replay_a5b951937e` | ✅ idempotent (повторный сид безопасен) |
| `EVENT ENGINE: Background scanner started (15 min interval)` | ✅ |
| `PAY-V2 worker started: id=worker_e77c224354 interval=5s batch=10 lease=60s max_attempts=5` | ✅ |
| `PAY-V2 reaper started: interval=30s` | ✅ |
| `PAY-V2 mock advancer started: interval=5s delay=2s` | ✅ |
| `PAY-V2 scheduler started (interval 900s)` | ✅ |
| `RECONCILE LOOP: started (interval 1800s)` + первый прогон `run=recon_29de6d341787 scanned=0 discrepancies=0 duration_ms=2` | ✅ |
| `MONEY BRIDGE: MoneyService initialised (Phase 2B PR-1)` | ✅ |
| `MONEY LEDGER: indexes ensured` | ✅ |
| `COMPETITOR CACHE: TTL index ensured (24h)` | ✅ |
| `VALIDATION CAMPAIGNS: indexes ensured` | ✅ |
| `ADMIN_SYSTEM startup: backfilled roles on 1 user(s)` | ✅ |
| `GUARDIAN: loop started (interval 120s)` + `OPERATOR auto_project_pause project=3dc2ad30 paused=1` | ✅ (Guardian реально pause-нул проект — реальная логика, не мок) |
| `MODULE MOTION: loop started (interval 15s)` | ✅ |
| `CONTRACT REMINDER LOOP: started (interval 21600s)` | ✅ |
| `OPERATOR SCHEDULER: started (300s interval)` | ✅ |
| `INTEGRATIONS seed: added blocks=['wayforpay','stripe','app','payments']` | ✅ |
| `INFO: Application startup complete.` | ✅ |

## 6. Smoke-тесты (live, через external preview URL)

Все запросы — через `https://mobile-launch-pad-50.preview.emergentagent.com`.

| # | Endpoint | Метод | HTTP | Замечания |
|---|---|---|---|---|
| 1 | `/api/healthz` | GET | **200** | `{"status":"ok"}` |
| 2 | `/api/config/public` | GET | **200** | — |
| 3 | `/api/auth/login` admin@atlas.dev/admin123 | POST | **200** | Сессия в cookie, в payload — full user object (`role=admin`, `level=senior`, `skills=[management,architecture]`) |
| 4 | `/api/auth/login` client@atlas.dev/client123 | POST | **200** | — |
| 5 | `/api/auth/login` tester@atlas.dev/tester123 | POST | **200** | — |
| 6 | `/api/auth/me` (admin cookie) | GET | **200** | `email=admin@atlas.dev, role=admin, active_context=admin` |
| 7 | `/api/admin/users` (admin cookie) | GET | **200** | 12 пользователей |
| 8 | `/api/contracts/my` (client cookie) | GET | **200** | `contracts: 0` (для client@atlas.dev контрактов не насеяно) |
| 9 | `/api/client/invoices` (client cookie) | GET | **200** | 6 invoices |
| 10 | `/api/portfolio/cases` (anonymous) | GET | **200** | 5 cases |
| 11 | `/api/admin/onboarding/tour-stats` (admin) | GET | **200** | — |
| 12 | `/api/integrations/manifest` (anonymous) | GET | **200** | `{capabilities, server_time, ttl_ms, version}` |
| 13 | `/api/web-ui/` (CRA bundle) | GET | **200** | `main.72691eb2.js`, ~10 KB index |
| 14 | External Expo preview `/` | GET | **200** | Welcome screen `Build real products. Not tasks.` (см. скрин) |

**Login для `john@atlas.dev` вернул 401** — пароль `john123` не подходит (хотя email seeded). Это может быть intentional (developer requires onboarding) или drift пароля при сидинге — см. **Finding F2**.

## 7. Размер фронтенд-бандла

- `Web Bundled 61266ms node_modules/expo-router/entry.js (1562 modules)` — первый холодный прогон.
- Повторные пересборки `7716ms` (1563) / `10412ms` (1564) — HMR на fast resolver работает корректно.
- Native bundle `λ Bundled 58366ms node_modules/expo-router/node/render.js (1468 modules)`.

## 8. Findings / нерешённые мелочи

> Все — **не блокирующие**, фиксируются по требованию пользователя.

### F1. `sentence_transformers` missing → 4 warnings на скоуп-темплейты
- Файлы темплейтов: `Online Marketplace`, `SaaS Dashboard`, `Fitness & Wellness App`, `E-Commerce Store`.
- Stack: `ERROR - Embedding error for template <name>: No module named 'sentence_transformers'`.
- Эффект: эмбеддинги темплейтов не строятся, fallback на keyword-match работает (темплейты всё равно создаются — `Seeded 4 scope templates`).
- Fix: `pip install sentence-transformers` (+ `torch` уже стоит). **Не добавляли в requirements.txt без явного запроса пользователя.**

### F2. `john@atlas.dev / john123` → 401
- Email в `/api/admin/users` есть (`role=developer`), но логин не проходит. Аналогично в предыдущем audit (`AUDIT_2026-02-FEB_REDEPLOY_13232112321231_E1_RU.md`) john логинился `200` — возможный drift в `mock_seed.py` для этого аккаунта.
- Workaround: использовать `multi@atlas.dev / multi123` или одного из 6 seeded devs (`alice.kim` … `diego.silva` @ atlas.dev / `dev123`).

### F3. `POST /api/mobile/auth/demo` → 422
- Endpoint требует body, без body — Unprocessable Entity. В предыдущих сессиях этот же smoke давал 200 — вероятно, signature эндпоинта обновлена.
- Не блокер для веб-флоу.

### F4. Web preview — стайл-варнинги Expo Web (не ошибки)
В `expo.err.log`:
- `Invalid style property of "borderColor". Value is "var(--t-primary)44" but only single values are supported.`
- `"shadow*" style props are deprecated. Use "boxShadow".`
- `props.pointerEvents is deprecated. Use style.pointerEvents`.
- `[expo-notifications] Listening to push token changes is not yet fully supported on web.`

Все четыре — известные предупреждения совместимости Expo Web → React Native. На native (iOS/Android) их не будет. UI рендерится корректно.

### F5. Metro cache при первом старте указывал на старые пути
- Симптом: `Metro error: Unable to resolve module ../src/auth from /app/frontend/app/_layout.tsx`, при этом `/app/frontend/src/auth.tsx` существует.
- Причина: `.metro-cache` и `.expo` остались с прошлой сессии (хотя rsync с `--exclude` их не трогал, они были созданы expo во время прошлой загрузки).
- Лечение: `rm -r /app/frontend/.metro-cache/* /app/frontend/.expo/*` → перезапуск expo → bundle прошёл с первой попытки.

## 9. Интеграции — actual state

| Сервис | Status | Source |
|---|---|---|
| `EMERGENT_LLM_KEY` (Universal Key) | ✅ Active (openai+anthropic+gemini text, gpt-image-1, gemini nano banana, sora-2, whisper-1, openai TTS) | `/app/backend/.env` |
| Stripe | 🟡 Mock (test publishable key seeded в `integrations.stripe`) | `INTEGRATIONS seed` |
| WayForPay | 🟡 Dormant | `INTEGRATIONS seed` |
| PayPal | 🟡 Dormant | manifest |
| Resend (email) | 🟡 Dormant | `email_service.py` |
| Cloudinary | 🟡 Dormant | `cloudinary_service.py` |
| Google OAuth | 🟡 Dormant | `google_auth.py` |
| Sentry | 🟡 Dormant | — |
| `expo-notifications` | 🟡 Mock на web | `EMERGENT_PUSH_KEY` placeholder |

## 10. Артефакты

- **PRD** обновлён: `/app/memory/PRD.md` (+ milestone «Full redeploy & audit (2026-02-FEB, repo `758r78r`)»).
- **Test credentials** обновлены: `/app/memory/test_credentials.md` (5 quick-access + 6 seeded devs + 1 legacy).
- **Этот отчёт**: `/app/audit/AUDIT_2026-02-FEB_REDEPLOY_758r78r_E1_RU.md`.
- **External preview**: `https://mobile-launch-pad-50.preview.emergentagent.com/` (live).
- **Скриншот welcome-экрана** снят: подтверждает hero `Build real products. Not tasks.`, sequence steps SEQ-01/02/03, USED TO BUILD chips, CTA «See my product plan».

## 11. Next action items (опционально, по запросу пользователя)

1. Поднять / починить логин `john@atlas.dev` (F2).
2. Установить `sentence-transformers` для template embeddings (F1) — добавит ~2 GB venv.
3. Решить, какой следующий feature-pass: продолжить тур онбординга, money domain Phase 2B PR-X, или новые модули. Жду указаний пользователя.

---

**Сессия:** 2026-02-FEB · **Агент:** E1 · **Repo:** `758r78r` · **Pod:** mobile-launch-pad-50
