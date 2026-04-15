from app.models.schemas import NormalizedDocument


class EventNormalizer:
    def normalize(self, event_type: str, payload: dict) -> NormalizedDocument | None:
        handlers = {
            "inventory.stock.low_stock_alert": self._normalize_low_stock,
            "inventory.stock.adjusted": self._normalize_stock_adjusted,
            "order.status.changed": self._normalize_order_status_changed,
            "warehouse.goods.received": self._normalize_goods_received,
            "procurement.delivery.delayed": self._normalize_delivery_delayed,
        }
        handler = handlers.get(event_type)
        if not handler:
            return None
        return handler(payload)

    def _normalize_low_stock(self, payload: dict) -> NormalizedDocument:
        return NormalizedDocument(
            content=(
                f"LOW STOCK ALERT: Product {payload.get('sku', 'unknown')} has "
                f"{payload.get('currentQuantity')} units left, threshold is "
                f"{payload.get('reorderThreshold')}. Product ID {payload.get('productId')}."
            ),
            entity_type="product",
            entity_id=payload.get("productId"),
            warehouse_id=payload.get("warehouseId"),
            metadata=payload,
        )

    def _normalize_stock_adjusted(self, payload: dict) -> NormalizedDocument:
        delta = payload.get("delta", 0)
        return NormalizedDocument(
            content=(
                f"Stock adjusted for product {payload.get('productId')}: delta {delta}, "
                f"previous {payload.get('previousQuantity')}, new {payload.get('newQuantity')}."
            ),
            entity_type="product",
            entity_id=payload.get("productId"),
            warehouse_id=payload.get("warehouseId"),
            metadata=payload,
        )

    def _normalize_order_status_changed(self, payload: dict) -> NormalizedDocument:
        return NormalizedDocument(
            content=(
                f"Order {payload.get('orderId')} status changed from {payload.get('previousStatus')} "
                f"to {payload.get('newStatus')} by {payload.get('changedBy')}."
            ),
            entity_type="order",
            entity_id=payload.get("orderId"),
            metadata=payload,
        )

    def _normalize_goods_received(self, payload: dict) -> NormalizedDocument:
        return NormalizedDocument(
            content=(
                f"Goods received at warehouse {payload.get('warehouseId')} for receipt "
                f"{payload.get('receiptId')} against PO {payload.get('purchaseOrderId')}."
            ),
            entity_type="warehouse",
            entity_id=payload.get("receiptId"),
            warehouse_id=payload.get("warehouseId"),
            metadata=payload,
        )

    def _normalize_delivery_delayed(self, payload: dict) -> NormalizedDocument:
        return NormalizedDocument(
            content=(
                f"Delivery delayed for PO {payload.get('purchaseOrderId')} from supplier "
                f"{payload.get('supplierId')} by {payload.get('daysOverdue')} days."
            ),
            entity_type="supplier",
            entity_id=payload.get("supplierId"),
            metadata=payload,
        )

