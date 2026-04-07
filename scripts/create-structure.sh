#!/bin/bash
set -e

# ─── Top-level directories ───────────────────────────────────────────
mkdir -p docs/architecture docs/api-contracts docs/runbooks
mkdir -p scripts
mkdir -p infrastructure/docker
mkdir -p infrastructure/kubernetes/namespaces
mkdir -p infrastructure/kubernetes/deployments
mkdir -p infrastructure/kubernetes/services
mkdir -p infrastructure/kubernetes/configmaps
mkdir -p infrastructure/kafka

# ─── Service scaffolds ───────────────────────────────────────────────
SERVICES=(
  "user-identity-service"
  "inventory-service"
  "warehouse-service"
  "order-management-service"
  "procurement-service"
  "notification-service"
  "reporting-service"
)

for SERVICE in "${SERVICES[@]}"; do
  BASE="services/$SERVICE/src/main/java/com/logistics/${SERVICE//-/}"
  TEST="services/$SERVICE/src/test/java/com/logistics/${SERVICE//-/}"
  RESOURCES="services/$SERVICE/src/main/resources"
  TEST_RESOURCES="services/$SERVICE/src/test/resources"
  MIGRATIONS="$RESOURCES/db/migration"

  mkdir -p "$BASE/domain/model"
  mkdir -p "$BASE/domain/service"
  mkdir -p "$BASE/domain/repository"
  mkdir -p "$BASE/domain/event"
  mkdir -p "$BASE/application/service"
  mkdir -p "$BASE/application/dto/request"
  mkdir -p "$BASE/application/dto/response"
  mkdir -p "$BASE/infrastructure/persistence/entity"
  mkdir -p "$BASE/infrastructure/persistence/repository"
  mkdir -p "$BASE/infrastructure/messaging/producer"
  mkdir -p "$BASE/infrastructure/messaging/consumer"
  mkdir -p "$BASE/infrastructure/config"
  mkdir -p "$BASE/api/controller"
  mkdir -p "$BASE/api/exception"
  mkdir -p "$TEST/unit"
  mkdir -p "$TEST/integration"
  mkdir -p "$RESOURCES"
  mkdir -p "$TEST_RESOURCES"
  mkdir -p "$MIGRATIONS"

  echo "Created structure for $SERVICE"
done

echo ""
echo "✓ Directory structure created successfully"
