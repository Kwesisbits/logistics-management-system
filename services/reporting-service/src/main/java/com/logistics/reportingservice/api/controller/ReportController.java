package com.logistics.reportingservice.api.controller;

import com.logistics.reportingservice.api.dto.InventorySnapshotResponse;
import com.logistics.reportingservice.api.dto.MovementAggregateResponse;
import com.logistics.reportingservice.api.dto.OrderSummaryResponse;
import com.logistics.reportingservice.infrastructure.persistence.repository.InventorySnapshotJpaRepository;
import com.logistics.reportingservice.infrastructure.persistence.repository.MovementAggregateJpaRepository;
import com.logistics.reportingservice.infrastructure.persistence.repository.OrderSummaryJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final InventorySnapshotJpaRepository inventorySnapshotJpaRepository;
    private final MovementAggregateJpaRepository movementAggregateJpaRepository;
    private final OrderSummaryJpaRepository orderSummaryJpaRepository;

    @GetMapping("/inventory/snapshot")
    public Page<InventorySnapshotResponse> listSnapshots(
        @RequestParam UUID productId,
        Pageable pageable
    ) {
        return inventorySnapshotJpaRepository.findAllByProductId(productId, pageable)
            .map(InventorySnapshotResponse::from);
    }

    @GetMapping("/inventory/low-stock")
    public Page<InventorySnapshotResponse> lowStock(Pageable pageable) {
        return Page.empty(pageable);
    }

    @GetMapping("/movements/history")
    public Page<MovementAggregateResponse> movementHistory(
        @RequestParam UUID warehouseId,
        Pageable pageable
    ) {
        return movementAggregateJpaRepository.findAllByWarehouseId(warehouseId, pageable)
            .map(MovementAggregateResponse::from);
    }

    @GetMapping("/orders/summary")
    public Page<OrderSummaryResponse> orderSummaries(
        @RequestParam UUID warehouseId,
        Pageable pageable
    ) {
        return orderSummaryJpaRepository.findAllByWarehouseId(warehouseId, pageable)
            .map(OrderSummaryResponse::from);
    }
}
