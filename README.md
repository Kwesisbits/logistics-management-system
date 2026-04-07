# Logistics Management System

A microservice-based logistics and inventory management platform.

## Services

| Service | Port | Description |
|---|---|---|
| user-identity-service | 8081 | Authentication, users, roles |
| inventory-service | 8082 | Products, stock levels, reservations |
| warehouse-service | 8083 | Locations, receipts, movements |
| order-management-service | 8084 | Orders, assignments, saga orchestration |
| procurement-service | 8085 | Suppliers, purchase orders |
| notification-service | 8086 | Event-driven notifications |
| reporting-service | 8087 | Analytics and read models |

## Local Infrastructure

| Tool | URL | Purpose |
|---|---|---|
| Kafka | localhost:9092 | Message broker |
| Redis | localhost:6379 | Sessions + distributed locks |
| Prometheus | localhost:9090 | Metrics collection |
| Grafana | localhost:3001 | Metrics dashboards |
| Jaeger | localhost:16686 | Distributed tracing |

## Quick Start

```bash
# 1. Start infrastructure
cd infrastructure/docker
docker-compose up -d

# 2. Create Kafka topics (wait 30s after step 1)
chmod +x ../../infrastructure/kafka/create-topics.sh
../../infrastructure/kafka/create-topics.sh

# 3. Start services in order: identity → inventory → warehouse → orders → procurement → notification → reporting
```

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production |
| `staging` | Pre-production |
| `develop` | Integration |
| `feature/*` | Feature work |
