# PRD — ATLAS DevOS / EVA-X

## Что это
Execution substrate (а не SaaS и не маркетплейс фрилансеров).
Клиент описывает идею → система генерирует scope + ценник → команда выполняет
под escrow-контрактом → QA пропускает поставку → выплаты автоматически.
Внешний бренд — **EVA-X**, внутренний — ATLAS DevOS.

## Слои

| Слой | Стек | Состояние |
|------|------|-----------|
| Backend | FastAPI 0.110 · MongoDB · litellm · emergentintegrations · Stripe · WayForPay · Cloudinary · Resend | **743 endpoint**, lifespan ok, MOCK режим |
| Mobile (Expo SDK 54) | expo-router · RN 0.81 · Reanimated 4 · TypeScript 5.9 | 5 ролей (admin/client/developer/tester/lead), **148 .tsx** |
| Web (React 18) | CRA + craco · Tailwind · Radix · `packages/design-system` | 236 файлов, 98 страниц кабинета, **не запущена сейчас** |
| Shared | `packages/runtime-client` · `packages/design-system` | Единый рантайм |

## Ключевые домены
1. **Money substrate** (запечатан, Phase 2C B4.5) — escrow, earnings, payout, divergence observer.
2. **Payouts V2** — 22 endpoint, 4 фоновых демона (worker/reaper/mock-advancer/scheduler).
3. **Acceptance / Assignment** — decision_layer, decomposition_engine, client_acceptance.
4. **Work execution** — module_execution, module_motion, time_tracking, event_engine.
5. **Intelligence brains** — developer_brain, team_intelligence, revenue_brain, execution_intelligence.
6. **Admin cockpit** — 5 frozen tabs (D1 amendment 1) + read-mostly drill-downs (текущее расхождение — 21 экран admin).

## Frozen scope (`docs/product-scope-freeze.md` + amendment 1)
- **D1:** Expo admin = 5 cockpit tabs + 8 read-mostly drill-downs. Полный admin = web.
- **D2:** Expo tester = Stage 4 (4 screens). Готово.
- **D3:** Lead = conversion surface only. Отдельной роли в auth **нет**.

## Текущее состояние (31 May 2026, E1 redeploy)
- ✅ Полный clone `svetlanaslinko057/evevevev` в `/app`.
- ✅ Backend uvicorn live на `:8001`, **743 paths** в `/openapi.json`, `/api/healthz=200`.
- ✅ Expo Metro live на `:3000`, tunnel ready, главный экран EVA-X отрендерился.
- ✅ MongoDB live, 11 seeded users (5 ролей), demo notifications, validations, scope templates.
- ✅ Background daemons: PAY-V2 worker/reaper/mock-advancer/scheduler, auto_guardian, module_motion, event_engine, operator scheduler, contract reminder loop, payout-v2 reconciler.
- ⚠️ Web (CRA) **не запущен** в supervisor (по дизайну Emergent). Чтобы поднять — `cd /app/web && yarn install && yarn build` + nginx.
- ⚠️ `sentence-transformers` не установлен → 4 ERROR при сидинге scope-template embeddings (template-семантика временно деградирована, но не блокирует boot).
- ⚠️ 1 предупреждение `Duplicate Operation ID audit_log_api_admin_audit_log_get` — нужно переименовать дубликат в `admin_users_layer.py`.
- ⚠️ D1 расхождение: фактически 21 экран в `/app/frontend/app/admin` vs 13 разрешённых в amendment 1.

## Quick-login users
См. `/app/memory/test_credentials.md`. Канонический admin — `admin@atlas.dev` / `admin123`.

## Полный аудит
`/app/audit/AUDIT_2026-05-31_E1_REDEPLOY_RU.md`

## Что дальше
См. `ROADMAP.md`. Приоритеты:
1. Починить duplicate operation ID (быстро, 1 файл).
2. Закрыть D1 расхождение (или открыть amendment #2).
3. Установить torch-cpu + sentence-transformers (опционально, для scope semantic matching).
4. Веб-кабинет: собрать (`yarn build`) и подключить как статику (если требуется).
5. Live-интеграции: при необходимости собрать ключи (Stripe / Resend / Cloudinary / Google OAuth).
6. i18n batch 3 (EN/UK parity sweep) — см. `audit/CABINET_I18N_SWEEP_2026-05-30.md`.
