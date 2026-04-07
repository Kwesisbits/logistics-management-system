package com.logistics.inventoryservice.infrastructure.persistence.repository;

import com.logistics.inventoryservice.infrastructure.persistence.entity.StockLevelEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockLevelJpaRepository extends JpaRepository<StockLevelEntity, UUID> {

    Optional<StockLevelEntity> findByProductIdAndLocationId(UUID productId, UUID locationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StockLevelEntity s WHERE s.productId = :productId AND s.locationId = :locationId")
    Optional<StockLevelEntity> findByProductIdAndLocationIdForUpdate(
        @Param("productId") UUID productId,
        @Param("locationId") UUID locationId
    );

    List<StockLevelEntity> findAllByProductId(UUID productId);

    @Query("SELECT s FROM StockLevelEntity s JOIN ProductEntity p ON s.productId = p.productId " +
           "WHERE s.quantityAvailable <= p.reorderThreshold AND p.isActive = true")
    List<StockLevelEntity> findAllBelowReorderThreshold();
}
