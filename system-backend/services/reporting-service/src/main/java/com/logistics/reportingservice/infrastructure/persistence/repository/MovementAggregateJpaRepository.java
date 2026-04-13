package com.logistics.reportingservice.infrastructure.persistence.repository;

import com.logistics.reportingservice.infrastructure.persistence.entity.MovementAggregateEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MovementAggregateJpaRepository extends JpaRepository<MovementAggregateEntity, UUID> {

    Page<MovementAggregateEntity> findAllByWarehouseId(UUID warehouseId, Pageable pageable);

    Page<MovementAggregateEntity> findAllByOrderByPeriodStartDesc(Pageable pageable);

    Page<MovementAggregateEntity> findAllByWarehouseIdOrderByPeriodStartDesc(UUID warehouseId, Pageable pageable);
}
