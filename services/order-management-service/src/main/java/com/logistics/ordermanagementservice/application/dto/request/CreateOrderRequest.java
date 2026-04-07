package com.logistics.ordermanagementservice.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
    @NotNull UUID customerId,
    @NotNull UUID warehouseId,
    String priority,
    LocalDate expectedDelivery,
    String notes,
    @NotEmpty @Valid List<OrderItemRequest> items
) {

    public record OrderItemRequest(
        @NotNull UUID productId,
        int quantity,
        @NotNull BigDecimal unitPrice
    ) {}
}
