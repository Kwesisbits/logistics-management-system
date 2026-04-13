package com.logistics.inventoryservice.application.service;

import com.logistics.inventoryservice.application.dto.response.BatchResponse;
import com.logistics.inventoryservice.infrastructure.persistence.repository.BatchJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BatchQueryService {

    private final BatchJpaRepository batchRepository;

    @Transactional(readOnly = true)
    public Page<BatchResponse> listBatches(int page, int limit) {
        return batchRepository.findAll(PageRequest.of(page - 1, limit)).map(BatchResponse::from);
    }
}
