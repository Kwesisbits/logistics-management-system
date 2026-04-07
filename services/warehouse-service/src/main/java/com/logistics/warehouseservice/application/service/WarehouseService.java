package com.logistics.warehouseservice.application.service;

import com.logistics.warehouseservice.api.exception.BusinessException;
import com.logistics.warehouseservice.application.dto.request.CreateWarehouseRequest;
import com.logistics.warehouseservice.application.dto.response.WarehouseResponse;
import com.logistics.warehouseservice.infrastructure.persistence.entity.WarehouseEntity;
import com.logistics.warehouseservice.infrastructure.persistence.repository.WarehouseJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WarehouseService {

    private final WarehouseJpaRepository warehouseRepository;

    @Transactional
    public WarehouseResponse createWarehouse(CreateWarehouseRequest request) {
        WarehouseEntity entity = new WarehouseEntity();
        entity.setName(request.name());
        entity.setStreet(request.street());
        entity.setCity(request.city());
        entity.setCountry(request.country());
        entity.setType(request.type());
        entity.setCapacity(request.capacity());
        entity.setActive(true);
        WarehouseEntity saved = warehouseRepository.save(entity);
        log.info("Warehouse created: id={}", saved.getWarehouseId());
        return WarehouseResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public WarehouseResponse getWarehouse(UUID id) {
        return warehouseRepository.findById(id)
            .map(WarehouseResponse::from)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Warehouse not found"));
    }

    @Transactional(readOnly = true)
    public Page<WarehouseResponse> listWarehouses(Pageable pageable) {
        return warehouseRepository.findAllByIsActiveTrue(pageable).map(WarehouseResponse::from);
    }
}
