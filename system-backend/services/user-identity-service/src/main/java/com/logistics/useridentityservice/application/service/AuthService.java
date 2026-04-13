package com.logistics.useridentityservice.application.service;

import com.logistics.useridentityservice.api.exception.BusinessException;
import com.logistics.useridentityservice.application.dto.request.LoginRequest;
import com.logistics.useridentityservice.application.dto.request.ResetPasswordRequest;
import com.logistics.useridentityservice.application.dto.response.LoginResponse;
import com.logistics.useridentityservice.infrastructure.persistence.entity.UserEntity;
import com.logistics.useridentityservice.infrastructure.persistence.repository.UserJpaRepository;
import com.logistics.useridentityservice.infrastructure.security.PasetoTokenService;
import com.logistics.useridentityservice.infrastructure.security.TokenClaims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserJpaRepository userRepository;
    private final PasetoTokenService tokenService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.email().toLowerCase())
            .orElseThrow(() -> new BusinessException("INVALID_CREDENTIALS", "Email or password is incorrect"));

        if (!user.isActive()) {
            throw new BusinessException("ACCOUNT_DEACTIVATED", "This account has been deactivated");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException("INVALID_CREDENTIALS", "Email or password is incorrect");
        }

        List<String> permissions = user.getRole().getPermissions().stream()
            .map(p -> p.getResource() + ":" + p.getAction())
            .collect(Collectors.toList());

        TokenClaims claims = new TokenClaims(
            user.getUserId(),
            user.getEmail(),
            user.getRole().getRoleId(),
            user.getRole().getName(),
            permissions,
            user.getWarehouseId()
        );

        String accessToken  = tokenService.issueAccessToken(claims);
        String refreshToken = tokenService.issueRefreshToken(user.getUserId().toString());

        user.setLastLogin(java.time.Instant.now());
        userRepository.save(user);

        log.info("User logged in: userId={}, role={}", user.getUserId(), user.getRole().getName());

        return new LoginResponse(
            accessToken,
            refreshToken,
            3600L,
            new LoginResponse.UserInfo(
                user.getUserId(),
                user.getEmail(),
                user.getRole().getName(),
                user.getWarehouseId()
            )
        );
    }

    @Transactional
    public void logout(String token, String tokenId) {
        tokenService.revokeToken(tokenId);
        log.info("User logged out: jti={}", tokenId);
    }

    /**
     * Self-service password reset (no email token). Intended for development / internal deployments;
     * production systems should add email verification or MFA.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        userRepository.findByEmail(request.email().toLowerCase()).ifPresent(user -> {
            if (!user.isActive()) {
                log.warn("Password reset ignored for deactivated account: {}", request.email());
                return;
            }
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
            userRepository.save(user);
            log.info("Password reset for userId={}", user.getUserId());
        });
    }
}
