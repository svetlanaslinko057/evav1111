#!/usr/bin/env bash
# bootstrap.sh — быстрое развёртывание ATLAS DevOS / EVA-X.
#
# Идемпотентно: безопасно прогонять повторно.
# Поддержка: Linux / macOS / Emergent container.
#
# Использование:
#   bash scripts/bootstrap.sh                # backend + frontend (Expo)
#   bash scripts/bootstrap.sh --with-web     # + web build
#   bash scripts/bootstrap.sh --no-start     # только зависимости, без запуска
#   bash scripts/bootstrap.sh --help

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ─── colours ────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_GREEN='\033[0;32m'; C_YELLOW='\033[0;33m'; C_RED='\033[0;31m'
  C_BLUE='\033[0;34m'; C_DIM='\033[2m'; C_RESET='\033[0m'
else
  C_GREEN=''; C_YELLOW=''; C_RED=''; C_BLUE=''; C_DIM=''; C_RESET=''
fi
ok()    { printf "${C_GREEN}✓${C_RESET} %s\n" "$1"; }
warn()  { printf "${C_YELLOW}⚠${C_RESET} %s\n" "$1"; }
fail()  { printf "${C_RED}✗${C_RESET} %s\n" "$1"; exit 1; }
step()  { printf "\n${C_BLUE}▶${C_RESET} ${C_DIM}%s${C_RESET}\n" "$1"; }

usage() {
  cat <<EOF
ATLAS DevOS / EVA-X — bootstrap

Usage: bash scripts/bootstrap.sh [options]

Options:
  --with-web    Дополнительно собрать /web (CRA production build).
  --no-start    Только установить зависимости, не запускать сервисы.
  --skip-mongo  Пропустить старт MongoDB (если уже запущен).
  --help, -h    Показать этот help.

После успешного запуска:
  Backend  → http://localhost:8001/api/healthz
  Expo     → http://localhost:3000
  Mongo    → mongodb://localhost:27017
EOF
}

WITH_WEB=0
NO_START=0
SKIP_MONGO=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-web)   WITH_WEB=1 ;;
    --no-start)   NO_START=1 ;;
    --skip-mongo) SKIP_MONGO=1 ;;
    -h|--help)    usage; exit 0 ;;
    *) fail "Unknown option: $1 (use --help)" ;;
  esac
  shift
done

# ─── 1. Tooling check ───────────────────────────────────────────────────────
step "Проверяю окружение"

command -v python3 >/dev/null 2>&1 || fail "Python 3 не найден. Установите 3.11+."
PY_VERSION="$(python3 -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")')"
ok "Python ${PY_VERSION}"

command -v node >/dev/null 2>&1 || fail "Node.js не найден. Установите Node 20+."
NODE_VERSION="$(node -v)"
ok "Node ${NODE_VERSION}"

command -v yarn >/dev/null 2>&1 || fail "Yarn не найден. npm install -g yarn@1.22"
ok "Yarn $(yarn -v)"

if [[ $SKIP_MONGO -eq 0 ]]; then
  command -v mongod >/dev/null 2>&1 || warn "mongod не найден локально (ok если используете remote MongoDB)"
fi

# ─── 2. ENV-файлы ───────────────────────────────────────────────────────────
step "Проверяю .env"

if [[ ! -f backend/.env ]]; then
  warn "backend/.env отсутствует — создаю с дефолтами (MOCK режим)"
  cat > backend/.env <<EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="atlas_devos"
EOF
  ok "backend/.env создан"
else
  ok "backend/.env найден"
fi

if [[ ! -f frontend/.env ]]; then
  warn "frontend/.env отсутствует — создаю минимальный"
  cat > frontend/.env <<EOF
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EOF
  ok "frontend/.env создан"
  warn "На Emergent EXPO_PACKAGER_* выставляются платформой — этот .env подойдёт для локальной разработки."
else
  ok "frontend/.env найден"
fi

# ─── 3. Backend deps ────────────────────────────────────────────────────────
step "Устанавливаю Python зависимости (backend)"

if [[ -d /root/.venv ]]; then
  PIP="/root/.venv/bin/pip"
  ok "Использую venv: /root/.venv"
else
  PIP="pip3"
fi

$PIP install --quiet --disable-pip-version-check -r backend/requirements.txt
ok "requirements.txt установлен"

# sentence-transformers отсутствует в requirements, но нужен для embedding
if ! $PIP show sentence-transformers >/dev/null 2>&1; then
  warn "sentence-transformers отсутствует — устанавливаю (≈400 MB с torch)"
  $PIP install --quiet --no-cache-dir sentence-transformers==5.5.1
fi
ok "sentence-transformers ok"

# ─── 4. Frontend deps ───────────────────────────────────────────────────────
step "Устанавливаю Node зависимости (frontend / Expo)"
( cd frontend && yarn install --frozen-lockfile --network-timeout 600000 >/dev/null )
ok "frontend/node_modules готов"

if [[ $WITH_WEB -eq 1 ]]; then
  step "Устанавливаю Node зависимости (web / CRA)"
  ( cd web && yarn install --frozen-lockfile --network-timeout 600000 >/dev/null )
  ok "web/node_modules готов"

  step "Сборка веб-клиента (CRA production)"
  ( cd web && yarn build )
  ok "web/build готов"
fi

# ─── 5. Старт сервисов ──────────────────────────────────────────────────────
if [[ $NO_START -eq 1 ]]; then
  step "--no-start — пропускаю запуск сервисов"
  ok "Bootstrap завершён. Запустите вручную или через supervisor."
  exit 0
fi

if command -v supervisorctl >/dev/null 2>&1; then
  step "Перезапускаю сервисы через supervisor"
  sudo supervisorctl restart backend expo mongodb 2>&1 | tail -5 || true
  sleep 8
else
  step "supervisor не найден — запускаю в background"

  if [[ $SKIP_MONGO -eq 0 ]] && command -v mongod >/dev/null 2>&1; then
    pgrep -x mongod >/dev/null 2>&1 || {
      nohup mongod --bind_ip_all > /tmp/mongod.log 2>&1 &
      ok "MongoDB запущен (PID $!)"
    }
  fi

  pkill -f "uvicorn server:app" 2>/dev/null || true
  nohup bash -c "cd $ROOT_DIR/backend && ${PIP%/pip}/python -m uvicorn server:app --host 0.0.0.0 --port 8001" \
    > /tmp/backend.log 2>&1 &
  ok "Backend запущен (PID $!) → /tmp/backend.log"

  pkill -f "expo start" 2>/dev/null || true
  nohup bash -c "cd $ROOT_DIR/frontend && yarn expo start --port 3000" \
    > /tmp/expo.log 2>&1 &
  ok "Expo запущен (PID $!) → /tmp/expo.log"

  sleep 10
fi

# ─── 6. Smoke ───────────────────────────────────────────────────────────────
step "Smoke-проверка"

if curl -sf -o /dev/null --max-time 30 --retry 5 --retry-delay 3 http://localhost:8001/api/healthz; then
  ok "GET /api/healthz → 200"
else
  warn "GET /api/healthz не отвечает (бэкенд может ещё стартовать; см. /tmp/backend.log или /var/log/supervisor/backend.*.log)"
fi

ENDPOINT_COUNT=$(curl -s http://localhost:8001/openapi.json 2>/dev/null | python3 -c "
import json, sys
try: print(len(json.load(sys.stdin).get('paths', {})))
except: print(0)
" || echo "0")
if [[ "$ENDPOINT_COUNT" -gt 700 ]]; then
  ok "OpenAPI: ${ENDPOINT_COUNT} endpoints зарегистрировано"
else
  warn "OpenAPI вернул только ${ENDPOINT_COUNT} endpoints (ожидается ≥740)"
fi

if curl -sf -o /dev/null --max-time 5 http://localhost:3000; then
  ok "Expo: http://localhost:3000 → 200"
else
  warn "Expo ещё не готов (метро бандлит ~60 с при первом старте)"
fi

# ─── 7. Готово ──────────────────────────────────────────────────────────────
cat <<EOF

${C_GREEN}═══════════════════════════════════════════════════════════════${C_RESET}
${C_GREEN}  Bootstrap завершён.${C_RESET}
${C_GREEN}═══════════════════════════════════════════════════════════════${C_RESET}

  Backend       → http://localhost:8001/api/healthz
  Expo          → http://localhost:3000
  OpenAPI       → http://localhost:8001/openapi.json (${ENDPOINT_COUNT} endpoints)
  Quick-login   → POST /api/auth/quick {"email":"admin@atlas.dev"}
  Credentials   → memory/test_credentials.md

  Дальше:
    • Live-flip:  выставьте INTEGRATIONS_LIVE_ENABLED=1 в backend/.env + ключи
    • Web-build:  bash scripts/bootstrap.sh --with-web
    • Дорожная карта: ROADMAP.md

EOF
