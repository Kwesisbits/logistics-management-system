package com.logistics.warehouseservice.application.service;

import com.logistics.warehouseservice.api.exception.BusinessException;
import com.logistics.warehouseservice.application.dto.request.CreateLocationRequest;
import com.logistics.warehouseservice.application.dto.response.LocationResponse;
import com.logistics.warehouseservice.infrastructure.persistence.entity.StorageLocationEntity;
import com.logistics.warehouseservice.infrastructure.persistence.repository.StorageLocationJpaRepository;
import com.logistics.warehouseservice.infrastructure.persistence.repository.WarehouseJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocationService {

    private final StorageLocationJpaRepository locationRepository;
    private final WarehouseJpaRepository warehouseRepository;

    @Transactional
    public LocationResponse addLocation(UUID warehouseId, CreateLocationRequest request) {
        warehouseRepository.findById(warehouseId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Warehouse not found"));
        StorageLocationEntity entity = new StorageLocationEntity();
        entity.setWarehouseId(warehouseId);
        entity.setZone(request.zone());
        entity.setAisle(request.aisle());
        entity.setShelf(request.shelf());
        entity.setBin(request.bin());
        entity.setLocationType(request.locationType());
        entity.setMaxCapacity(request.maxCapacity());
        entity.setActive(true);
        StorageLocationEntity saved = locationRepository.save(entity);
        log.info("Location added: id={}, warehouse={}", saved.getLocationId(), warehouseId);
        return LocationResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<LocationResponse> getLocations(UUID warehouseId) {
        return locationRepository.findAllByWarehouseIdAndIsActiveTrue(warehouseId).stream()
            .map(LocationResponse::from).toList();
    }
}
