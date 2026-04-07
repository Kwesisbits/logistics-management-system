package com.logistics.inventoryservice.application.service;

import com.logistics.inventoryservice.api.exception.BusinessException;
import com.logistics.inventoryservice.application.dto.request.ReserveStockRequest;
import com.logistics.inventoryservice.application.dto.response.ReservationResponse;
import com.logistics.inventoryservice.infrastructure.persistence.entity.*;
import com.logistics.inventoryservice.infrastructure.persistence.repository.*;
import com.logistics.inventoryservice.infrastructure.messaging.OutboxEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockService {

    private final StockLevelJpaRepository stockLevelRepository;
    private final StockReservationJpaRepository reservationRepository;
    private final ProductJpaRepository productRepository;
    private final OutboxEventPublisher outboxPublisher;

    @Transactional
    public ReservationResponse reserveStock(ReserveStockRequest request) {
        if (reservationRepository.existsByOrderId(request.orderId())) {
            return reservationRepository.findByOrderId(request.orderId())
                .map(ReservationResponse::from)
                .orElseThrow();
        }

        List<StockLevelEntity> lockedLevels = new ArrayList<>();
        List<StockReservationItemEntity> items = new ArrayList<>();

        for (ReserveStockRequest.ReservationItem item : request.items()) {
            StockLevelEntity level = stockLevelRepository
                .findByProductIdAndLocationIdForUpdate(item.productId(), item.locationId())
                .orElseThrow(() -> new BusinessException("NOT_FOUND",
                    "No stock level found for product " + item.productId() +
                    " at location " + item.locationId()));

            if (level.getQuantityAvailable() < item.quantity()) {
                throw new BusinessException("INSUFFICIENT_STOCK",
                    "Insufficient stock for product " + item.productId() +
                    ": requested=" + item.quantity() + ", available=" + level.getQuantityAvailable());
            }

            level.setQuantityReserved(level.getQuantityReserved() + item.quantity());
            lockedLevels.add(level);

            StockReservationItemEntity lineItem = new StockReservationItemEntity();
            lineItem.setProductId(item.productId());
            lineItem.setLocationId(item.locationId());
            lineItem.setQuantity(item.quantity());
            items.add(lineItem);
        }

        stockLevelRepository.saveAll(lockedLevels);

        StockReservationEntity reservation = new StockReservationEntity();
        reservation.setOrderId(request.orderId());
        reservation.setStatus("CONFIRMED");
        reservation.setExpiresAt(Instant.now().plusSeconds(1800));
        reservation.setItems(items);
        items.forEach(i -> i.setReservation(reservation));

        StockReservationEntity saved = reservationRepository.save(reservation);

        outboxPublisher.publish(
            "inventory.stock.reserved",
            request.orderId(),
            buildReservedEvent(saved, request)
        );

        checkLowStock(request.items());

        log.info("Stock reserved: reservationId={}, orderId={}", saved.getReservationId(), request.orderId());
        return ReservationResponse.from(saved);
    }

    @Transactional
    public void releaseStock(UUID orderId, String reason) {
        StockReservationEntity reservation = reservationRepository.findByOrderId(orderId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Reservation not found for order " + orderId));

        if ("RELEASED".equals(reservation.getStatus())) {
            log.info("Release is no-op: reservation already released for orderId={}", orderId);
            return;
        }

        for (StockReservationItemEntity item : reservation.getItems()) {
            stockLevelRepository.findByProductIdAndLocationIdForUpdate(item.getProductId(), item.getLocationId())
                .ifPresent(level -> {
                    level.setQuantityReserved(
                        Math.max(0, level.getQuantityReserved() - item.getQuantity())
                    );
                    stockLevelRepository.save(level);
                });
        }

        reservation.setStatus("RELEASED");
        reservationRepository.save(reservation);

        outboxPublisher.publish(
            "inventory.stock.released",
            orderId,
            String.format("{\"eventType\":\"inventory.stock.released\"," +
                "\"payload\":{\"reservationId\":\"%s\",\"orderId\":\"%s\",\"reason\":\"%s\"}}",
                reservation.getReservationId(), orderId, reason)
        );

        log.info("Stock released: orderId={}, reason={}", orderId, reason);
    }

    private void checkLowStock(List<ReserveStockRequest.ReservationItem> items) {
        for (ReserveStockRequest.ReservationItem item : items) {
            stockLevelRepository.findByProductIdAndLocationId(item.productId(), item.locationId())
                .ifPresent(level -> {
                    productRepository.findById(level.getProductId()).ifPresent(product -> {
                        if (level.getQuantityAvailable() <= product.getReorderThreshold()) {
                            outboxPublisher.publish(
                                "inventory.stock.low_stock_alert",
                                item.productId(),
                                String.format("{\"eventType\":\"inventory.stock.low_stock_alert\"," +
                                    "\"payload\":{\"productId\":\"%s\",\"sku\":\"%s\"," +
                                    "\"currentQuantity\":%d,\"reorderThreshold\":%d}}",
                                    product.getProductId(), product.getSku(),
                                    level.getQuantityAvailable(), product.getReorderThreshold())
                            );
                        }
                    });
                });
        }
    }

    private String buildReservedEvent(StockReservationEntity reservation, ReserveStockRequest request) {
        return String.format(
            "{\"eventType\":\"inventory.stock.reserved\"," +
            "\"payload\":{\"reservationId\":\"%s\",\"orderId\":\"%s\",\"expiresAt\":\"%s\"}}",
            reservation.getReservationId(), request.orderId(), reservation.getExpiresAt()
        );
    }
}
