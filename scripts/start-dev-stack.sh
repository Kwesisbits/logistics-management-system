#!/usr/bin/env bash
# Start infrastructure (Docker), all Spring Boot services, then the Vite frontend.
#
# Prerequisites:
#   - Docker (for Kafka, Zookeeper, Redis, etc.)
#   - Java 21 + Maven on PATH
#   - Node.js 20+ + npm on PATH
#   - PostgreSQL on localhost with databases per each service's application.yml
#     (e.g. logistics_identity_db, logistics_inventory_db, …)
#
# Usage:
#   chmod +x scripts/start-dev-stack.sh
#   ./scripts/start-dev-stack.sh              # backends in background, then npm run dev (foreground)
#   ./scripts/start-dev-stack.sh --backends-only
#   ./scripts/start-dev-stack.sh --frontend-only
#
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/system-backend"
DOCKER_DIR="$BACKEND/infrastructure/docker"
FRONTEND="$ROOT/system-frontend"
LOG_DIR="$ROOT/.dev-logs"
mkdir -p "$LOG_DIR"

BACKENDS_ONLY=false
FRONTEND_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --backends-only) BACKENDS_ONLY=true ;;
    --frontend-only) FRONTEND_ONLY=true ;;
  esac
done

start_docker_infra() {
  if [[ ! -f "$DOCKER_DIR/docker-compose.yml" ]]; then
    echo "ERROR: docker-compose.yml not found at $DOCKER_DIR"
    exit 1
  fi
  echo ">>> Starting Docker stack (Kafka, Redis, …) from $DOCKER_DIR"
  (cd "$DOCKER_DIR" && docker compose up -d)
  echo ">>> Waiting a few seconds for Kafka/Redis to accept connections…"
  sleep 8
}

start_spring_service() {
  local module_path="$1"
  local log_name="$2"
  echo ">>> Starting $module_path (logging to $LOG_DIR/$log_name.log)"
  (
    cd "$BACKEND"
    mvn -q -pl "$module_path" spring-boot:run >>"$LOG_DIR/$log_name.log" 2>&1
  ) &
  echo $! >"$LOG_DIR/$log_name.pid"
}

if [[ "$FRONTEND_ONLY" != true ]]; then
  start_docker_infra

  echo ">>> Starting Spring Boot services (Maven reactor: $BACKEND)"
  # Order: identity first (auth), then the rest in parallel-friendly batch
  start_spring_service "services/user-identity-service" "user-identity-service"
  sleep 3
  start_spring_service "services/inventory-service" "inventory-service"
  start_spring_service "services/warehouse-service" "warehouse-service"
  start_spring_service "services/order-management-service" "order-management-service"
  start_spring_service "services/procurement-service" "procurement-service"
  start_spring_service "services/notification-service" "notification-service"
  start_spring_service "services/reporting-service" "reporting-service"

  echo ""
  echo "Backend PIDs and logs:"
  shopt -s nullglob
  for f in "$LOG_DIR"/*.pid; do
    [[ -f "$f" ]] || continue
    name="$(basename "$f" .pid)"
    echo "  $name  PID $(cat "$f")  →  tail -f \"$LOG_DIR/$name.log\""
  done
  echo ""
  echo "Ports (default): 8081 identity, 8082 inventory, 8083 warehouse, 8084 orders,"
  echo "                8085 procurement, 8086 notification, 8087 reporting"
  echo ""
  shopt -u nullglob
fi

if [[ "$BACKENDS_ONLY" == true ]]; then
  echo ">>> Done (--backends-only). Start the UI with: cd system-frontend && npm run dev"
  exit 0
fi

if [[ ! -d "$FRONTEND" ]]; then
  echo "ERROR: Frontend not found at $FRONTEND"
  exit 1
fi

cd "$FRONTEND"
if [[ ! -d node_modules ]]; then
  echo ">>> Running npm install…"
  npm install
fi

echo ">>> Starting Vite dev server (http://localhost:5173) — Ctrl+C stops only the UI; Java/Docker keep running"
exec npm run dev
