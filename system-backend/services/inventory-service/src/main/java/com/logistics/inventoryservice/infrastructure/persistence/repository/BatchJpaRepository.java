package com.logistics.inventoryservice.infrastructure.persistence.repository;

import com.logistics.inventoryservice.infrastructure.persistence.entity.BatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BatchJpaRepository extends JpaRepository<BatchEntity, UUID> {
}
