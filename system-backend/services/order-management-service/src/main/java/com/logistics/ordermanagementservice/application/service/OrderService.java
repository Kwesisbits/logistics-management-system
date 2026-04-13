package com.logistics.ordermanagementservice.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.logistics.ordermanagementservice.api.exception.BusinessException;
import com.logistics.ordermanagementservice.application.dto.request.CancelOrderRequest;
import com.logistics.ordermanagementservice.application.dto.request.CreateOrderRequest;
import com.logistics.ordermanagementservice.application.dto.response.OrderItemResponse;
import com.logistics.ordermanagementservice.application.dto.response.OrderResponse;
import com.logistics.ordermanagementservice.application.dto.response.OrderStatusHistoryResponse;
import com.logistics.ordermanagementservice.infrastructure.lock.OrderDistributedLock;
import com.logistics.ordermanagementservice.infrastructure.messaging.OutboxEventPublisher;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderItemEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.OrderStatusHistoryEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.entity.SagaInstanceEntity;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.OrderJpaRepository;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.OrderStatusHistoryJpaRepository;
import com.logistics.ordermanagementservice.infrastructure.persistence.repository.SagaInstanceJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final UUID INVENTORY_PIPELINE_ACTOR = UUID.fromString("a0000000-0000-0000-0000-000000000001");

    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.ofEntries(
        Map.entry("DRAFT", Set.of("PENDING")),
        Map.entry("PENDING", Set.of("PROCESSING", "CANCELLED", "FAILED")),
        Map.entry("PROCESSING", Set.of("SHIPPED", "CANCELLED", "FAILED")),
        Map.entry("SHIPPED", Set.of("DELIVERED"))
    );

    private final OrderJpaRepository orderRepository;
    private final OrderStatusHistoryJpaRepository historyRepository;
    private final SagaInstanceJpaRepository sagaRepository;
    private final OutboxEventPublisher outboxEventPublisher;
    private final ObjectMapper objectMapper;
    private final OrderDistributedLock orderDistributedLock;
    private final OrderFulfillmentSagaOrchestrator sagaOrchestrator;

    private void validateTransition(String from, String to) {
        Set<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new BusinessException(
                "INVALID_STATE_TRANSITION",
                "Cannot transition order from " + from + " to " + to
            );
        }
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        String priority = request.priority() == null || request.priority().isBlank()
            ? "STANDARD"
            : request.priority();
        if (!Set.of("STANDARD", "HIGH", "URGENT").contains(priority)) {
            throw new BusinessException("VALIDATION_ERROR", "Invalid priority: " + priority);
        }

        OrderEntity order = new OrderEntity();
        order.setCustomerId(request.customerId());
        order.setWarehouseId(request.warehouseId());
        order.setStatus("DRAFT");
        order.setPriority(priority);
        order.setExpectedDelivery(request.expectedDelivery());
        order.setNotes(request.notes());

        BigDecimal total = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        for (CreateOrderRequest.OrderItemRequest line : request.items()) {
            OrderItemEntity item = new OrderItemEntity();
            item.setOrder(order);
            item.setProductId(line.productId());
            item.setQuantity(line.quantity());
            item.setUnitPrice(line.unitPrice().setScale(2, RoundingMode.HALF_UP));
            order.getItems().add(item);
            BigDecimal lineAmount = line.unitPrice()
                .multiply(BigDecimal.valueOf(line.quantity()))
                .setScale(2, RoundingMode.HALF_UP);
            total = total.add(lineAmount);
        }
        order.setTotalAmount(total);

        OrderEntity saved = orderRepository.save(order);
        return OrderResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(UUID orderId) {
        OrderEntity order = orderRepository.findById(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
        return OrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> listOrders(Pageable pageable) {
        return orderRepository.findAll(pageable).map(OrderResponse::from);
    }

    @Transactional(readOnly = true)
    public List<OrderItemResponse> listOrderItems(UUID orderId) {
        OrderEntity order = orderRepository.findById(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
        return order.getItems().stream().map(OrderItemResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderStatusHistoryResponse> listOrderHistory(UUID orderId) {
        if (!orderRepository.existsById(orderId)) {
            throw new BusinessException("NOT_FOUND", "Order not found");
        }
        return historyRepository.findAllByOrderIdOrderByChangedAtDesc(orderId).stream()
            .map(OrderStatusHistoryResponse::from)
            .toList();
    }

    @Transactional
    public OrderResponse submitOrder(UUID orderId, UUID submittedBy) {
        if (!orderDistributedLock.tryLock(orderId)) {
            throw new BusinessException("CONFLICT", "Order is locked for processing");
        }
        registerLockRelease(orderId);
        try {
            OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
            if (!"DRAFT".equals(order.getStatus())) {
                throw new BusinessException("INVALID_STATE_TRANSITION", "Only DRAFT orders can be submitted");
            }
            String from = order.getStatus();
            validateTransition(from, "PENDING");
            order.setStatus("PENDING");
            orderRepository.save(order);

            UUID correlationId = UUID.randomUUID();
            String createdPayload = toJson(Map.of(
                "orderId", orderId.toString(),
                "customerId", order.getCustomerId().toString(),
                "warehouseId", order.getWarehouseId().toString(),
                "correlationId", correlationId.toString()
            ));
            outboxEventPublisher.publish("order.created", correlationId, createdPayload);

            SagaInstanceEntity saga = new SagaInstanceEntity();
            saga.setCorrelationId(correlationId);
            saga.setSagaType("ORDER_FULFILLMENT");
            saga.setPayload(toJson(Map.of("orderId", orderId.toString(), "correlationId", correlationId.toString())));
            sagaRepository.save(saga);

            recordHistory(orderId, from, "PENDING", submittedBy, null);
            return OrderResponse.from(orderRepository.findById(orderId).orElseThrow());
        } catch (JsonProcessingException e) {
            throw new BusinessException("VALIDATION_ERROR", "Failed to serialize event payload");
        }
    }

    private void registerLockRelease(UUID orderId) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                orderDistributedLock.unlock(orderId);
            }
        });
    }

    @Transactional
    public OrderResponse cancelOrder(UUID orderId, CancelOrderRequest request) {
        OrderEntity order = orderRepository.findById(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
        String from = order.getStatus();
        if (!"PENDING".equals(from) && !"PROCESSING".equals(from)) {
            throw new BusinessException(
                "INVALID_STATE_TRANSITION",
                "Only PENDING or PROCESSING orders can be cancelled"
            );
        }
        validateTransition(from, "CANCELLED");
        order.setStatus("CANCELLED");
        orderRepository.save(order);
        recordHistory(orderId, from, "CANCELLED", request.cancelledBy(), request.reason());
        try {
            String payload = toJson(Map.of(
                "orderId", orderId.toString(),
                "reason", request.reason() != null ? request.reason() : "",
                "cancelledBy", request.cancelledBy().toString()
            ));
            outboxEventPublisher.publish("order.cancelled", orderId, payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException("VALIDATION_ERROR", "Failed to serialize event payload");
        }
        return OrderResponse.from(orderRepository.findById(orderId).orElseThrow());
    }

    @Transactional
    public void advanceToProcessingFromInventory(UUID orderId, UUID correlationId) {
        OrderEntity order = orderRepository.findById(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
        String from = order.getStatus();
        validateTransition(from, "PROCESSING");
        order.setStatus("PROCESSING");
        orderRepository.save(order);
        recordHistory(orderId, from, "PROCESSING", INVENTORY_PIPELINE_ACTOR, "Stock reserved");
        sagaOrchestrator.onStockReservedStep(correlationId);
        try {
            String payload = toJson(Map.of(
                "orderId", orderId.toString(),
                "status", "PROCESSING",
                "correlationId", correlationId != null ? correlationId.toString() : ""
            ));
            UUID corr = correlationId != null ? correlationId : orderId;
            outboxEventPublisher.publish("order.status.changed", corr, payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException("VALIDATION_ERROR", "Failed to serialize event payload");
        }
    }

    @Transactional
    public void markFailedAfterReservation(UUID orderId, UUID correlationId, String reason) {
        OrderEntity order = orderRepository.findById(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Order not found"));
        String from = order.getStatus();
        validateTransition(from, "FAILED");
        order.setStatus("FAILED");
        orderRepository.save(order);
        recordHistory(orderId, from, "FAILED", INVENTORY_PIPELINE_ACTOR, reason);
        sagaOrchestrator.onStockReservationFailedStep(correlationId, reason);
        try {
            String payload = toJson(Map.of(
                "orderId", orderId.toString(),
                "status", "FAILED",
                "reason", reason != null ? reason : ""
            ));
            UUID corr = correlationId != null ? correlationId : orderId;
            outboxEventPublisher.publish("order.status.changed", corr, payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException("VALIDATION_ERROR", "Failed to serialize event payload");
        }
    }

    private void recordHistory(UUID orderId, String fromStatus, String toStatus, UUID changedBy, String reason) {
        OrderStatusHistoryEntity h = new OrderStatusHistoryEntity();
        h.setOrderId(orderId);
        h.setFromStatus(fromStatus);
        h.setToStatus(toStatus);
        h.setChangedBy(changedBy);
        h.setReason(reason);
        historyRepository.save(h);
    }

    private String toJson(Map<String, String> map) throws JsonProcessingException {
        return objectMapper.writeValueAsString(new LinkedHashMap<>(map));
    }
}
