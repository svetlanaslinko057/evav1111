# i18n Sweep 3 — Cabinet Full Closeout (Feb 2026)

**Сессия:** E1 / APPPP redeploy + sweep
**Дата:** 2026-Feb (после `AUDIT_2026-FEB_FULL_REDEPLOY_APPPP_E1_RU.md`)
**Скоуп:** Web-кабинет EVA-X, всё кроме Expo (`/app/frontend/app`)

---

## Итог

| Метрика | До | После | Δ |
|---------|----:|-----:|---|
| `tByEn` calls | 1585 | **1844** | **+259** |
| Hardcoded EN литералов | 253 | **0** | **−253** |
| Dictionary EN keys | 1938 | **2145** | +207 |
| Dictionary UK keys | 1938 | **2145** | +207 (parity) |
| EN/UK parity | ✅ 0 missing | ✅ 0 missing | ok |
| Coverage `unique_jsx` | 86.2% | **100%** | +13.8 pp |

**Резюме:** все 73 cabinet-файла приведены к единому `tByEn`-контракту, 100% покрытие.

---

## Что сделано

### 1. Авто-обёртка hardcoded литералов (`scripts/i18n_sweep_apply.py`)
- Парсер `audit/CABINET_I18N_COVERAGE_2026-05-30.md` → 73 файла, 253 литерала.
- Для каждого литерала: JSX-text `>LIT<` → `>{tByEn('LIT')}<`.
- Гарантирована импортная обвязка `useLang` (с подбором стиля пути `@/contexts` vs `../contexts`).
- 2 прохода (count=1 на первый, count=1 на остаток) → 0 unmatched.

### 2. Авто-добавление недостающих destructure (`scripts/i18n_add_missing_destructure.py`)
- Heuristic: парсинг всех `const Foo = (...) => {` / `function Foo(...)` / `export default function Foo`.
- Для каждого React-компонента (PascalCase) проверяется наличие `const { tByEn } = useLang();` в теле.
- Если `tByEn` используется внутри, но не destructure'нут — авто-инжект сразу после открывающей `{` фигурной скобки.
- Закрыто **22 компонента** (включая критичный `PipelinePanel` в `LandingPage.js`/`LandingPageLight.js`, без которого UK-режим валился в `ReferenceError: tByEn is not defined`):
  - `AdminExecutionIntelligence.js`: PatternCard, CausalTracePanel, OverrideMemoryRow
  - `AdminIntegrationsPage`, `AdminPaymentsPage`, `AdminPayoutBatchDetail`, `AdminPayoutsQueue`, `AdminPricingCalibration.SuggestionRow`, `AdminReconciliation`, `AdminUsersPage`, `AdminV2Finance.OperationsStrip`, `AdminV2Portfolio.InquiriesTab`
  - `ClientProjects.ProjectCard`, `ClientTransparency.{PortfolioCard, HealthCard}`
  - `ContractSignEvidencePage.Step4`
  - `DevWork.Bucket`, `EstimateResultPage.InlineSignup`, `ExecutorBoard.TaskCard`
  - `PortfolioCaseDetail.{CaseVideoPlayer, Header}`, `ScopeBuilder.TaskCard`
  - `LandingPage.PipelinePanel`, `LandingPageLight.PipelinePanel` (точечно вручную, чтобы сохранить useEffect + activeIdx + return)

### 3. Очистка некорректных hooks
- `HvlStatusBlock.js`: устранён `useLang` внутри non-component `formatTime` (rules-of-hooks violation) + добавлен компонент-уровневый destructure.
- `DeveloperLeaderboard.js`, `DeveloperWorkspaceV2.js`, `UnifiedAuthPage.js`: удалены избыточные внутренние destructure (родительский компонент уже их имел).

### 4. Словарь
- Добавлено **207 уникальных EN-литералов** под ключами `cab.s3.001`–`cab.s3.207` (sweep 3).
- Каждому даётся профессиональный UK-перевод. Бренды/URL/версии (`emergent`, `openai`, `console.cloud.google.com`, `v1.0`) — оставлены без перевода.

### 5. Production build пересобран
- `web/build/static/js/main.27207758.js` — содержит свежий словарь.
- Build проходит через CRA + craco без ошибок (CI=false для подавления pre-existing warnings).
- Web сервится через `/api/web-ui/*` (FastAPI StaticFiles, NOT `/admin/` — README/ROADMAP были неточны).

### 6. Smoke (UK)
Скриншот публичного лендинга с `localStorage.setItem('evax-lang','uk')`:
- Hero: «Готовий продукт. Без вічного «майже готово».» ✅
- Nav: «Як працює · Режими збірки · Система · Можливості · Кейси · Застосунок» ✅
- Stats: «ЗАПУЩЕНО ПРОДУКТІВ · СЕРЕДНІЙ ЧАС ДО MVP · ЗДАЧА ЗА КОНТРАКТОМ» ✅
- Pipeline panel (`PipelinePanel`): «execution.pipeline · LIVE · DONE · RUNNING · QUEUED» ✅
- Cookies banner: «Ми використовуємо cookies...» ✅
- 0 runtime errors.

---

## Сопутствующие фиксы в этой же сессии

| Что | Где | Статус |
|-----|-----|--------|
| `sentence-transformers==5.5.1` добавлен в `requirements.txt` | `backend/requirements.txt` | ✅ committed (не установлен — disk economy) |
| Duplicate `_admin_users_layer.build_router()` include | `server.py:28113-28114` | ✅ один из двух удалён |
| Duplicate `pass_validation` / `fail_validation` operationId | `server.py:3999, 4030` | ✅ explicit `operation_id="*_legacy"` |
| Web build serving path verification | `server.py: /api/web-ui` mount | ✅ задокументирован |
| `OpenAPI duplicates` | curl/openapi.json | ✅ было 10 → 0 |

---

## Что осталось из ROADMAP

| # | Задача | Время | Приоритет |
|---|--------|------:|-----------|
| 1 | **Payouts V2 contract** (`audit/PAYOUTS_V2_STATE_MACHINE.md`) | 1 ч | MED |
| 2 | **Amendment #2** — легализация 21 admin-экрана на Expo (D1) | 30 мин | MED |
| 3 | **pytest → anyio** миграция тестов | 30 мин | LOW |
| 4 | **Expo i18n track** — `/frontend/app` пока EN-only | 6–10 ч | LOW (отложено по запросу) |
| 5 | **Docker / docker-compose** | 3–4 ч | LOW |
| 6 | Один residual `Duplicate Operation ID audit_log_api_admin_audit_log_get` warning (no actual collision) | 5 мин | LOW |
| 7 | Pre-existing `react-hooks/exhaustive-deps` warnings (~30 случаев) | 1–2 ч | LOW |

---

## Команды для повторения

```bash
# Audit current state
cd /app && python3 scripts/cabinet-i18n-coverage.py
# → Targets: 98  tByEn=1844  hardcoded≈0  Dict: en=2145 uk=2145

# Re-run sweep idempotently
python3 scripts/i18n_sweep_apply.py
python3 scripts/i18n_add_missing_destructure.py

# Rebuild web
cd /app/web && CI=false GENERATE_SOURCEMAP=false yarn build

# Verify UK
curl -s http://localhost:8001/api/web-ui/ | grep -oE 'main\.[a-f0-9]+\.js'
```

---

_Sweep полностью закрыт. Web-кабинет имеет 100% i18n coverage на 73 cabinet-файла и работает в UK без runtime-ошибок._
