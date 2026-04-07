package com.logistics.warehouseservice.api.controller;

import com.logistics.warehouseservice.application.dto.request.CreateReceiptRequest;
import com.logistics.warehouseservice.application.dto.response.ReceiptResponse;
import com.logistics.warehouseservice.application.service.ReceiptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/warehouse/receipts")
@RequiredArgsConstructor
public class ReceiptController {

    private final ReceiptService receiptService;

    @PostMapping
    public ResponseEntity<ReceiptResponse> createReceipt(@Valid @RequestBody CreateReceiptRequest request) {
        ReceiptResponse response = receiptService.createReceipt(request);
        return ResponseEntity
            .created(URI.create("/api/v1/warehouse/receipts/" + response.receiptId()))
            .body(response);
    }

    @PostMapping("/{receiptId}/confirm")
    public ResponseEntity<ReceiptResponse> confirmReceipt(@PathVariable UUID receiptId) {
        return ResponseEntity.ok(receiptService.confirmReceipt(receiptId));
    }
}
