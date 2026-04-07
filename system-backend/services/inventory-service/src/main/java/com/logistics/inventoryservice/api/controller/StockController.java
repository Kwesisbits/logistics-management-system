package com.logistics.inventoryservice.api.controller;

import com.logistics.inventoryservice.application.dto.request.ReserveStockRequest;
import com.logistics.inventoryservice.application.dto.response.ReservationResponse;
import com.logistics.inventoryservice.application.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @PostMapping("/reserve")
    public ResponseEntity<ReservationResponse> reserveStock(@Valid @RequestBody ReserveStockRequest request) {
        return ResponseEntity.ok(stockService.reserveStock(request));
    }

    @PostMapping("/release/{orderId}")
    public ResponseEntity<Void> releaseStock(
        @PathVariable UUID orderId,
        @RequestParam(defaultValue = "SAGA_COMPENSATION") String reason
    ) {
        stockService.releaseStock(orderId, reason);
        return ResponseEntity.noContent().build();
    }
}
