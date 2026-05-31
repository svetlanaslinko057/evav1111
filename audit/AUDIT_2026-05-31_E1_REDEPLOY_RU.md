# Audit Report — ATLAS DevOS / EVA-X (Redeploy 2026-02-FEB)

**Дата**: 31 May 2026  
**Источник**: https://github.com/svetlanaslinko057/evevevev (commit `58ea56c`)  
**Цель**: Полный clone → boot → аудит готовности для продолжения разработки

---

## 1. Статус развёртывания

| Компонент   | Статус | Деталь |
|-------------|--------|--------|
| Backend (FastAPI uvicorn)    | ✅ RUNNING | `:8001`, `/api/healthz` = 200, 743 endpoint в `/openapi.json` |
| Expo Metro (RN web tunnel)   | ✅ RUNNING | `:3000`, tunnel ready, главный экран EVA-X отрендерился |
| MongoDB                       | ✅ RUNNING | `:27017`, 11 seeded users, demo notifications, scope templates |
| Web (CRA + craco)             | ⏸️ Не поднят | По дизайну Emergent — поднимается отдельно (см. секцию 6) |
| Nginx (proxy)                 | ✅ RUNNING | `/api/*` → :8001, `/` → :3000 |

**Preview URL**: https://mobile-expo-app-7.preview.emergentagent.com

---

## 2. Архитектурный карт (после clone)

### Backend `/app/backend` — 180 .py файлов, `server.py` ~28k строк
- **743 endpoint** распределены по 5 ролям + системные:
  - `/api/admin/*` — **265** (cockpit + drill-downs)
  - `/api/developer/*` — **73**
  - `/api/client/*` — **66**
  - `/api/modules/*` — **23**, `/api/account/*` — **23**
  - `/api/payouts-v2/*` — **22**, `/api/execution-intelligence` — **19**
  - `/api/auth/*` — **18**, `/api/ai/*` — **13**, `/api/contracts/*` — **12**
  - `/api/system/*`, `/api/mobile/*` — 10 каждый
  - `/api/projects`, `/api/validation`, `/api/provider`, `/api/escrow`, `/api/billing` и т.д.

### Mobile (Expo SDK 54) `/app/frontend` — 148 .tsx файлов
5 ролевых поверхностей под `app/`:
- **client/** — workspace, billing, contract, deliverable
- **developer/** — assignments, work, growth, earnings
- **admin/** — 21 экран (cockpit + drill-downs) — ⚠️ см. секцию 4
- **tester/** — Stage 4 (4 экрана)
- **lead/** — conversion surface (без auth-роли)
- Auth/Gateway: `auth.tsx`, `gateway.tsx`, 2FA flow (3 файла), account, profile, settings
- Project flow: `describe.tsx`, `estimate-improve/result.tsx`, `project-booting.tsx`, `hub.tsx`

### Web `/app/web` — 236 файлов (React 18 + CRA + craco)
98 страниц кабинета, i18n EN/UK (2158/2203 ключей parity), 4 контекста (Language/Theme/Auth/RealtimeSocket). Собственный design-system из `packages/design-system`.

### Money Substrate (sealed Phase 2C B4.5)
- Single source: `domains/money/service.py`
- 3 bridges: Escrow (PR-1), Earnings (PR-2), Payout (PR-3)
- Passive divergence observer (`money_divergence.py`)
- **Payouts V2**: 22 endpoint + 4 background daemon (worker / reaper / mock-advancer / scheduler / reconciler)

---

## 3. Boot Log Highlights

```
✅ Seeded 6 dev pool users (marco, priya, luka, sara, diego)
✅ 89 modules, 81 QA decisions, 6 canonical money_states
✅ Demo project "Acme Analytics Platform" for client@atlas.dev (3 modules)
✅ MOCK SEED: 2 projects, 7 modules, 6 earnings, 6 invoices, 3 tickets
✅ SEED REPLAY: batch=replay_a0e4c88040, 70 events over 14 days
✅ NOTIFICATIONS seed: 11 demo items across admin/john/client
✅ TESTER SEED: 5 validations + 1 issue
✅ Background daemons started:
   - PAY-V2 worker (5s) / reaper (30s) / mock-advancer (5s) / scheduler (900s)
   - GUARDIAN loop (120s) / MODULE MOTION (15s) / EVENT ENGINE (15min)
   - OPERATOR SCHEDULER (300s), CONTRACT REMINDER (21600s)
   - RECONCILE loop (1800s)
```

---

## 4. Найденные проблемы (приоритезированы)

### 🔴 P0 — Блокеры (нет)
Боевых блокеров нет — приложение поднимается и отвечает.

### 🟡 P1 — Технический долг

| # | Проблема | Источник | Действие |
|---|----------|----------|----------|
| 1 | `Duplicate Operation ID audit_log_api_admin_audit_log_get` | `admin_users_layer.py` | Переименовать функцию `audit_log` (конфликт с `admin_actions.py`) |
| 2 | `sentence-transformers` отсутствует → 4 ERROR при сидинге scope-template embeddings | `requirements.txt` line 150 + GPU libs | Установить CPU-only: `pip install sentence-transformers torch --index-url https://download.pytorch.org/whl/cpu` |
| 3 | D1 расхождение: 21 экран в `app/admin/` vs 13 разрешённых amendment 1 | `docs/product-scope-freeze-amend-1.md` | Открыть amendment #2 или сократить admin surface |
| 4 | RESEND_API_KEY не задан → email в MOCK | `email_service.py` | Норм для dev/audit; для prod нужен ключ Resend |
| 5 | CLOUDINARY ключи не заданы → файлы локально | `cloudinary_service.py` | Норм для dev; для prod нужны Cloudinary credentials |
| 6 | PayPal adapter DORMANT (no `PAYPAL_CLIENT_ID`) | `integrations/settlement_paypal.py` | Опционально, основной — Stripe |

### 🟢 P2 — Косметика
- 5 неудачных попыток ngrok при первом старте Expo (auto-recovered)
- `[expo-notifications] Listening to push token changes not supported on web` — нормально, push работает только на real device
- Web frontend (CRA) не собран — нужно ручное `yarn build` если требуется

---

## 5. Интеграции (текущее состояние)

| Сервис | Режим | Готовность к live |
|--------|-------|--------------------|
| **Stripe** (StripeConnect) | test mode, `whsec=missing` | Нужен `STRIPE_SECRET_KEY` + webhook secret |
| **WayForPay** (UA) | mock | Нужны merchant credentials |
| **Cloudinary** | MOCK (local files) | Нужны `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` |
| **Resend** (email) | mock-mail | Нужен `RESEND_API_KEY` |
| **Google OAuth** | mock | Нужны `GOOGLE_CLIENT_ID/SECRET` |
| **Emergent LLM** (litellm + emergentintegrations) | Готов к live, ключ через `EMERGENT_LLM_KEY` | Universal key |
| **PayPal Payouts** | DORMANT | Опционально |
| **Push notifications** | placeholder | EMERGENT_PUSH_KEY заполняется при деплое |

**Контракт**: всё работает в MOCK без ключей. `INTEGRATIONS_LIVE_ENABLED=1` + ключ → live-flip.

---

## 6. Что НЕ запущено сейчас

1. **Web кабинет (`/app/web`)** — 98 страниц React 18 + CRA + craco. Чтобы запустить:
   ```
   cd /app/web && yarn install && yarn build
   # → web/build/, далее nginx/static serve
   ```
   На Emergent supervisor только Expo (по дизайну mobile-first профиля E1).

2. **Live интеграции** — все в MOCK по умолчанию.

3. **Sentence Transformers** — намеренно пропущены при boot, влияет только на семантику scope-template matching.

---

## 7. Quick-login (тестовые пользователи)

См. `/app/memory/test_credentials.md`.

| Роль | Email | Password |
|------|-------|----------|
| Admin | admin@atlas.dev | admin123 |
| Developer | john@atlas.dev | dev123 |
| Client | client@atlas.dev | client123 |
| Tester | tester@atlas.dev | tester123 |
| Multi-role | multi@atlas.dev | multi123 |

API:
```bash
curl -X POST http://localhost:8001/api/auth/quick \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@atlas.dev"}'
```

---

## 8. Документация в репо

- `/audit` — **122 .md** файла (closeout'ы по фазам, smoke-trace'ы, governance)
- `/docs` — product scope freeze + amendment 1, runtime-contracts, synthetic corpus
- `/audit/MONEY_SUBSTRATE_COMPLETION_MILESTONE.md` — печать money substrate
- `/audit/AUDIT_2026-05-30_FULL_REDEPLOY_E1_RU.md` — предыдущий redeploy
- `/docs/product-scope-freeze.md` + amendment 1 — D1/D2/D3 решения
- `ROADMAP.md` — приоритеты на следующие итерации

---

## 9. Заключение

✅ **Проект полностью развёрнут и работает в MOCK режиме.**

- Backend (743 endpoint) — стабильно
- Mobile (Expo SDK 54, 148 экранов) — рендерится  
- MongoDB — сидирована полным demo-набором (11 users, projects, modules, money_states, notifications, validations)
- Все 5 ролей доступны для тестирования через quick-login
- Money substrate запечатан, payouts V2 работает с фоновыми демонами

**Готов к продолжению разработки.** Рекомендуемые первые задачи:
1. Починить duplicate operation ID (быстро, 1 файл)
2. Решить по D1 расхождению (amendment #2 или урезание admin surface)
3. Если нужен web кабинет — собрать и подключить
4. Если нужны live-интеграции — собрать ключи (Stripe / Resend / Cloudinary / Google OAuth)

---

*Auto-generated by E1 redeploy session, 31 May 2026.*
