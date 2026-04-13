package com.logistics.ordermanagementservice.api.controller;

import com.logistics.ordermanagementservice.application.dto.request.CancelOrderRequest;
import com.logistics.ordermanagementservice.application.dto.request.CreateOrderRequest;
import com.logistics.ordermanagementservice.application.dto.response.OrderItemResponse;
import com.logistics.ordermanagementservice.application.dto.response.OrderResponse;
import com.logistics.ordermanagementservice.application.dto.response.OrderStatusHistoryResponse;
import com.logistics.ordermanagementservice.application.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private static final UUID SUBMIT_ACTOR = UUID.fromString("c0000000-0000-0000-0000-000000000001");

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        OrderResponse response = orderService.createOrder(request);
        return ResponseEntity
            .created(URI.create("/api/v1/orders/" + response.orderId()))
            .body(response);
    }

    @GetMapping
    public ResponseEntity<Page<OrderResponse>> listOrders(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(orderService.listOrders(PageRequest.of(page - 1, limit)));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.getOrder(orderId));
    }

    @GetMapping("/{orderId}/items")
    public ResponseEntity<List<OrderItemResponse>> getOrderItems(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.listOrderItems(orderId));
    }

    @GetMapping("/{orderId}/history")
    public ResponseEntity<List<OrderStatusHistoryResponse>> getOrderHistory(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.listOrderHistory(orderId));
    }

    @PostMapping("/{orderId}/submit")
    public ResponseEntity<OrderResponse> submitOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.submitOrder(orderId, SUBMIT_ACTOR));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
        @PathVariable UUID orderId,
        @Valid @RequestBody CancelOrderRequest request
    ) {
        return ResponseEntity.ok(orderService.cancelOrder(orderId, request));
    }
}
