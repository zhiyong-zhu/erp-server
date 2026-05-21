package com.erp.system.controller;

import com.erp.common.core.result.Result;
import com.erp.common.security.model.SecurityUser;
import com.erp.system.dto.auth.LoginRequest;
import com.erp.system.dto.auth.LoginResponse;
import com.erp.system.dto.auth.RefreshTokenRequest;
import com.erp.system.dto.auth.UserInfoResponse;
import com.erp.system.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "认证管理", description = "登录、登出、Token刷新、用户信息")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "用户登录")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(authService.login(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "用户登出")
    public Result<Void> logout(@AuthenticationPrincipal SecurityUser currentUser) {
        authService.logout(currentUser.getUserId());
        return Result.success();
    }

    @PostMapping("/refresh")
    @Operation(summary = "刷新Token")
    public Result<LoginResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return Result.success(authService.refreshToken(request));
    }

    @GetMapping("/userinfo")
    @Operation(summary = "获取当前用户信息")
    public Result<UserInfoResponse> getUserInfo(@AuthenticationPrincipal SecurityUser currentUser) {
        return Result.success(authService.getCurrentUser(currentUser.getUserId()));
    }
}
