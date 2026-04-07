package com.logistics.procurementservice.infrastructure.persistence.repository;

import com.logistics.procurementservice.infrastructure.persistence.entity.PurchaseOrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PurchaseOrderJpaRepository extends JpaRepository<PurchaseOrderEntity, UUID> {
    Page<PurchaseOrderEntity> findAllBySupplierId(UUID supplierId, Pageable pageable);

    Page<PurchaseOrderEntity> findAllByStatus(String status, Pageable pageable);
}
