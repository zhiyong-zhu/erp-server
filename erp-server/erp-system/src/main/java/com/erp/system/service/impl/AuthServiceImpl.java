package com.erp.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.common.core.exception.BizException;
import com.erp.common.core.result.ErrorCode;
import com.erp.common.redis.service.RedisService;
import com.erp.common.security.jwt.JwtTokenProvider;
import com.erp.common.security.model.SecurityUser;
import com.erp.system.dto.auth.LoginRequest;
import com.erp.system.dto.auth.LoginResponse;
import com.erp.system.dto.auth.RefreshTokenRequest;
import com.erp.system.dto.auth.UserInfoResponse;
import com.erp.system.entity.SysDepartment;
import com.erp.system.entity.SysPermission;
import com.erp.system.entity.SysRole;
import com.erp.system.entity.SysUser;
import com.erp.system.entity.SysUserRole;
import com.erp.system.mapper.SysDepartmentMapper;
import com.erp.system.mapper.SysPermissionMapper;
import com.erp.system.mapper.SysRoleMapper;
import com.erp.system.mapper.SysUserMapper;
import com.erp.system.mapper.SysUserRoleMapper;
import com.erp.system.service.AuthService;
import com.erp.system.service.CustomUserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class AuthServiceImpl implements AuthService {

    private static final String REFRESH_TOKEN_KEY = "auth:refresh_token:";
    private static final String USER_PERMISSIONS_KEY = "user:permissions:";

    private final SysUserMapper sysUserMapper;
    private final SysUserRoleMapper sysUserRoleMapper;
    private final SysRoleMapper sysRoleMapper;
    private final SysPermissionMapper sysPermissionMapper;
    private final SysDepartmentMapper sysDepartmentMapper;
    private final CustomUserDetailsService userDetailsService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final RedisService redisService;

    public AuthServiceImpl(SysUserMapper sysUserMapper,
                           SysUserRoleMapper sysUserRoleMapper,
                           SysRoleMapper sysRoleMapper,
                           SysPermissionMapper sysPermissionMapper,
                           SysDepartmentMapper sysDepartmentMapper,
                           CustomUserDetailsService userDetailsService,
                           JwtTokenProvider jwtTokenProvider,
                           PasswordEncoder passwordEncoder,
                           RedisService redisService) {
        this.sysUserMapper = sysUserMapper;
        this.sysUserRoleMapper = sysUserRoleMapper;
        this.sysRoleMapper = sysRoleMapper;
        this.sysPermissionMapper = sysPermissionMapper;
        this.sysDepartmentMapper = sysDepartmentMapper;
        this.userDetailsService = userDetailsService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.redisService = redisService;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        SysUser user = sysUserMapper.selectOne(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, request.getUsername()));

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BizException(ErrorCode.AUTH_CREDENTIALS_ERROR, "用户名或密码错误");
        }

        if (user.getStatus() != 1) {
            throw new BizException(ErrorCode.AUTH_CREDENTIALS_ERROR, "账号已被禁用");
        }

        SecurityUser securityUser = userDetailsService.loadUserByUsername(user.getId());

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getUsername());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        redisService.set(REFRESH_TOKEN_KEY + user.getId(), refreshToken,
                jwtTokenProvider.getRefreshTokenExpiration(), TimeUnit.MILLISECONDS);

        user.setLastLoginAt(LocalDateTime.now());
        sysUserMapper.updateById(user);

        return LoginResponse.of(accessToken, refreshToken, jwtTokenProvider.getAccessTokenExpiration());
    }

    @Override
    public void logout(String userId) {
        redisService.delete(REFRESH_TOKEN_KEY + userId);
        redisService.delete(USER_PERMISSIONS_KEY + userId);
    }

    @Override
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        if (!jwtTokenProvider.validateToken(request.getRefreshToken())) {
            throw new BizException(ErrorCode.AUTH_TOKEN_EXPIRED, "Refresh Token已过期");
        }

        String userId = jwtTokenProvider.getUserIdFromToken(request.getRefreshToken());
        String storedToken = redisService.get(REFRESH_TOKEN_KEY + userId);

        if (storedToken == null || !storedToken.equals(request.getRefreshToken())) {
            throw new BizException(ErrorCode.AUTH_TOKEN_INVALID, "无效的Refresh Token");
        }

        SysUser user = sysUserMapper.selectById(userId);
        if (user == null || user.getStatus() != 1) {
            throw new BizException(ErrorCode.AUTH_TOKEN_INVALID, "用户不存在或已被禁用");
        }

        String newAccessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getUsername());
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        redisService.set(REFRESH_TOKEN_KEY + user.getId(), newRefreshToken,
                jwtTokenProvider.getRefreshTokenExpiration(), TimeUnit.MILLISECONDS);

        return LoginResponse.of(newAccessToken, newRefreshToken, jwtTokenProvider.getAccessTokenExpiration());
    }

    @Override
    public UserInfoResponse getCurrentUser(String userId) {
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            throw new BizException(ErrorCode.RESOURCE_NOT_FOUND, "用户不存在");
        }

        UserInfoResponse response = new UserInfoResponse();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setRealName(user.getRealName());
        response.setAvatar(user.getAvatar());
        response.setEmail(user.getEmail());
        response.setPhone(user.getPhone());
        response.setDepartmentId(user.getDepartmentId());

        if (user.getDepartmentId() != null) {
            SysDepartment dept = sysDepartmentMapper.selectById(user.getDepartmentId());
            if (dept != null) {
                response.setDepartmentName(dept.getName());
            }
        }

        List<SysUserRole> userRoles = sysUserRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId));
        if (!userRoles.isEmpty()) {
            List<String> roleIds = userRoles.stream().map(SysUserRole::getRoleId).collect(Collectors.toList());
            List<SysRole> roles = sysRoleMapper.selectBatchIds(roleIds);
            response.setRoles(roles.stream().map(SysRole::getCode).collect(Collectors.toList()));

            List<SysPermission> permissions = sysPermissionMapper.selectList(
                    new LambdaQueryWrapper<SysPermission>()
                            .inSql(SysPermission::getId,
                                    "SELECT permission_id FROM sys_role_permission WHERE role_id IN ("
                                            + roleIds.stream().map(id -> "'" + id + "'").collect(Collectors.joining(","))
                                            + ")")
                            .eq(SysPermission::getStatus, 1)
            );
            response.setPermissions(permissions.stream().map(SysPermission::getCode).collect(Collectors.toList()));
        } else {
            response.setRoles(List.of());
            response.setPermissions(List.of());
        }

        return response;
    }
}
