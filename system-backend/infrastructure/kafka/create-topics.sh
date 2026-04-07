#!/bin/bash
# Run this after Kafka is healthy (docker-compose up -d, wait ~30s)

KAFKA_CONTAINER="logistics-kafka"

echo "Creating Kafka topics..."

topics=(
  "inventory.stock.reserved"
  "inventory.stock.reservation_failed"
  "inventory.stock.released"
  "inventory.stock.adjusted"
  "inventory.stock.low_stock_alert"
  "inventory.product.created"
  "inventory.product.updated"
  "inventory.product.deleted"
  "warehouse.goods.received"
  "warehouse.goods.dispatched"
  "warehouse.stock.moved"
  "warehouse.location.capacity_exceeded"
  "order.created"
  "order.status.changed"
  "order.cancelled"
  "order.assigned"
  "order.delayed"
  "procurement.purchase_order.created"
  "procurement.purchase_order.submitted"
  "procurement.purchase_order.received"
  "procurement.delivery.delayed"
  "identity.user.created"
  "identity.user.deactivated"
  "identity.token.revoked"
)

# DLQ topics
dlq_topics=(
  "inventory.stock.reserved.dlq"
  "inventory.stock.reservation_failed.dlq"
  "warehouse.goods.received.dlq"
  "warehouse.goods.dispatched.dlq"
  "order.created.dlq"
  "order.status.changed.dlq"
  "procurement.purchase_order.submitted.dlq"
)

for topic in "${topics[@]}"; do
  docker exec $KAFKA_CONTAINER kafka-topics \
    --bootstrap-server localhost:9092 \
    --create \
    --if-not-exists \
    --topic "$topic" \
    --partitions 3 \
    --replication-factor 1
  echo "  ✓ $topic"
done

for topic in "${dlq_topics[@]}"; do
  docker exec $KAFKA_CONTAINER kafka-topics \
    --bootstrap-server localhost:9092 \
    --create \
    --if-not-exists \
    --topic "$topic" \
    --partitions 1 \
    --replication-factor 1
  echo "  ✓ $topic (DLQ)"
done

echo ""
echo "✓ All Kafka topics created"
