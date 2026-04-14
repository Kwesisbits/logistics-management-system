package com.logistics.useridentityservice.api.controller;

import com.logistics.useridentityservice.application.dto.request.CreateUserRequest;
import com.logistics.useridentityservice.application.dto.request.UpdateUserRoleRequest;
import com.logistics.useridentityservice.application.dto.response.UserResponse;
import com.logistics.useridentityservice.application.service.UserManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/identity/users")
@RequiredArgsConstructor
public class UserController {

    private final UserManagementService userManagementService;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('COMPANY_ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserResponse response = userManagementService.createUser(request);
        return ResponseEntity
            .created(URI.create("/api/v1/identity/users/" + response.userId()))
            .body(response);
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('COMPANY_ADMIN')")
    public ResponseEntity<Page<UserResponse>> listUsers(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) UUID companyId
    ) {
        return ResponseEntity.ok(
            userManagementService.listUsers(PageRequest.of(page - 1, limit), companyId)
        );
    }

    @GetMapping("/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> getUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(userManagementService.getUserById(userId));
    }

    @PatchMapping("/{userId}/deactivate")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('COMPANY_ADMIN')")
    public ResponseEntity<Void> deactivateUser(@PathVariable UUID userId) {
        userManagementService.deactivateUser(userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{userId}/role")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('COMPANY_ADMIN')")
    public ResponseEntity<UserResponse> updateUserRole(
        @PathVariable UUID userId,
        @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        return ResponseEntity.ok(userManagementService.updateUserRole(userId, request));
    }
}
