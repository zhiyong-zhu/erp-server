package com.erp.system.controller;

import com.erp.common.core.page.PageQuery;
import com.erp.common.core.page.PageResult;
import com.erp.common.core.result.ErrorCode;
import com.erp.common.core.result.Result;
import com.erp.system.dto.user.UserCreateRequest;
import com.erp.system.dto.user.UserQueryRequest;
import com.erp.system.dto.user.UserResponse;
import com.erp.system.dto.user.UserUpdateRequest;
import com.erp.system.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/system/users")
@Tag(name = "用户管理", description = "用户CRUD、密码重置")
public class SysUserController {

    private final SysUserService sysUserService;

    public SysUserController(SysUserService sysUserService) {
        this.sysUserService = sysUserService;
    }

    @GetMapping
    @Operation(summary = "分页查询用户列表")
    @PreAuthorize("hasAuthority('system:user:list')")
    public Result<PageResult<UserResponse>> listUsers(UserQueryRequest query, PageQuery page) {
        return Result.success(sysUserService.listUsers(query, page));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取用户详情")
    @PreAuthorize("hasAuthority('system:user:list')")
    public Result<UserResponse> getUser(@PathVariable String id) {
        return Result.success(sysUserService.getUserById(id));
    }

    @PostMapping
    @Operation(summary = "创建用户")
    @PreAuthorize("hasAuthority('system:user:create')")
    public Result<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        return Result.success(sysUserService.createUser(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新用户")
    @PreAuthorize("hasAuthority('system:user:update')")
    public Result<UserResponse> updateUser(@PathVariable String id, @Valid @RequestBody UserUpdateRequest request) {
        return Result.success(sysUserService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除用户")
    @PreAuthorize("hasAuthority('system:user:delete')")
    public Result<Void> deleteUser(@PathVariable String id) {
        sysUserService.deleteUser(id);
        return Result.success();
    }

    @PutMapping("/{id}/reset-password")
    @Operation(summary = "重置用户密码")
    @PreAuthorize("hasAuthority('system:user:update')")
    public Result<Void> resetPassword(@PathVariable String id, @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        if (newPassword == null || newPassword.length() < 6) {
            return Result.error(ErrorCode.PARAM_ERROR.getCode(), "新密码长度不能少于6位");
        }
        sysUserService.resetPassword(id, newPassword);
        return Result.success();
    }
}
