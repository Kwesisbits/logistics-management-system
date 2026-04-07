package com.logistics.useridentityservice.application.service;

import com.logistics.useridentityservice.api.exception.BusinessException;
import com.logistics.useridentityservice.application.dto.request.CreateUserRequest;
import com.logistics.useridentityservice.application.dto.response.UserResponse;
import com.logistics.useridentityservice.infrastructure.persistence.entity.UserEntity;
import com.logistics.useridentityservice.infrastructure.persistence.repository.RoleJpaRepository;
import com.logistics.useridentityservice.infrastructure.persistence.repository.UserJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final UserJpaRepository userRepository;
    private final RoleJpaRepository roleRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.email().toLowerCase())) {
            throw new BusinessException("CONFLICT", "A user with this email already exists");
        }

        var role = roleRepository.findById(request.roleId())
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "Role not found"));

        if ("WAREHOUSE_STAFF".equals(role.getName()) && request.warehouseId() == null) {
            throw new BusinessException("VALIDATION_ERROR", "WAREHOUSE_STAFF must have a warehouse assigned");
        }

        UserEntity entity = new UserEntity();
        entity.setEmail(request.email().toLowerCase());
        entity.setPasswordHash(passwordEncoder.encode(request.temporaryPassword()));
        entity.setFirstName(request.firstName());
        entity.setLastName(request.lastName());
        entity.setRole(role);
        entity.setWarehouseId(request.warehouseId());
        entity.setActive(true);

        UserEntity saved = userRepository.save(entity);
        log.info("User created: userId={}, role={}", saved.getUserId(), role.getName());

        return UserResponse.from(saved);
    }

    @Transactional
    public void deactivateUser(UUID userId) {
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "User not found"));
        user.setActive(false);
        userRepository.save(user);
        log.info("User deactivated: userId={}", userId);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID userId) {
        return userRepository.findById(userId)
            .map(UserResponse::from)
            .orElseThrow(() -> new BusinessException("NOT_FOUND", "User not found"));
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> listUsers(Pageable pageable) {
        return userRepository.findAllByIsActiveTrue(pageable).map(UserResponse::from);
    }
}
