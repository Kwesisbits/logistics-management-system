package com.logistics.useridentityservice.application.dto.request;

import jakarta.validation.constraints.*;
import java.util.UUID;

public record CreateUserRequest(
    @Email @NotBlank String email,
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotNull UUID roleId,
    UUID warehouseId,
    @NotBlank @Size(min = 8) String temporaryPassword
) {}
