package com.logistics.inventoryservice.infrastructure.persistence.repository;

import com.logistics.inventoryservice.infrastructure.persistence.entity.ProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ProductJpaRepository extends JpaRepository<ProductEntity, UUID> {
    Optional<ProductEntity> findBySku(String sku);

    Optional<ProductEntity> findByCompanyIdAndSku(UUID companyId, String sku);

    boolean existsByCompanyIdAndSku(UUID companyId, String sku);

    Page<ProductEntity> findAllByCompanyIdAndIsActiveTrue(UUID companyId, Pageable pageable);

    Page<ProductEntity> findAllByCompanyIdAndCategoryAndIsActiveTrue(UUID companyId, String category, Pageable pageable);

    Optional<ProductEntity> findByProductIdAndCompanyId(UUID productId, UUID companyId);
}
