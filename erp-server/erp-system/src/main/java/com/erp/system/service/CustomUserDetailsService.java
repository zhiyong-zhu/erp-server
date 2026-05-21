package com.erp.system.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.erp.common.core.exception.BizException;
import com.erp.common.core.result.ErrorCode;
import com.erp.common.redis.service.RedisService;
import com.erp.common.security.model.SecurityUser;
import com.erp.system.entity.SysPermission;
import com.erp.system.entity.SysRole;
import com.erp.system.entity.SysUser;
import com.erp.system.entity.SysUserRole;
import com.erp.system.mapper.SysPermissionMapper;
import com.erp.system.mapper.SysRoleMapper;
import com.erp.system.mapper.SysUserMapper;
import com.erp.system.mapper.SysUserRoleMapper;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private static final String USER_PERMISSIONS_KEY = "user:permissions:";
    private static final long PERMISSIONS_TTL_HOURS = 2;

    private final SysUserMapper sysUserMapper;
    private final SysUserRoleMapper sysUserRoleMapper;
    private final SysRoleMapper sysRoleMapper;
    private final SysPermissionMapper sysPermissionMapper;
    private final RedisService redisService;

    public CustomUserDetailsService(SysUserMapper sysUserMapper,
                                    SysUserRoleMapper sysUserRoleMapper,
                                    SysRoleMapper sysRoleMapper,
                                    SysPermissionMapper sysPermissionMapper,
                                    RedisService redisService) {
        this.sysUserMapper = sysUserMapper;
        this.sysUserRoleMapper = sysUserRoleMapper;
        this.sysRoleMapper = sysRoleMapper;
        this.sysPermissionMapper = sysPermissionMapper;
        this.redisService = redisService;
    }

    @Override
    public SecurityUser loadUserByUsername(String userId) {
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            throw new BizException(ErrorCode.AUTH_TOKEN_INVALID);
        }

        List<SimpleGrantedAuthority> authorities = loadAuthorities(user.getId());

        List<SysUserRole> userRoles = sysUserRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, user.getId()));
        Integer dataScope = 3;
        if (!userRoles.isEmpty()) {
            List<String> roleIds = userRoles.stream().map(SysUserRole::getRoleId).collect(Collectors.toList());
            List<SysRole> roles = sysRoleMapper.selectBatchIds(roleIds);
            dataScope = roles.stream()
                    .map(SysRole::getDataScope)
                    .min(Integer::compare)
                    .orElse(3);
        }

        return new SecurityUser(
                user.getId(),
                user.getUsername(),
                user.getPassword(),
                user.getRealName(),
                user.getDepartmentId(),
                dataScope,
                user.getStatus() == 1,
                authorities
        );
    }

    public SecurityUser loadUserByUsernameAndPassword(String username) {
        SysUser user = sysUserMapper.selectOne(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, username));
        if (user == null) {
            throw new BizException(ErrorCode.AUTH_CREDENTIALS_ERROR, "用户名或密码错误");
        }
        return loadUserByUsername(user.getId());
    }

    private List<SimpleGrantedAuthority> loadAuthorities(String userId) {
        String cacheKey = USER_PERMISSIONS_KEY + userId;
        Map<String, String> cached = redisService.hGetAll(cacheKey);
        if (cached != null && !cached.isEmpty()) {
            return cached.values().stream()
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
        }

        List<SysUserRole> userRoles = sysUserRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId));

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        if (!userRoles.isEmpty()) {
            List<String> roleIds = userRoles.stream().map(SysUserRole::getRoleId).collect(Collectors.toList());

            List<SysRole> roles = sysRoleMapper.selectBatchIds(roleIds);
            for (SysRole role : roles) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getCode()));
            }

            List<SysPermission> permissions = sysPermissionMapper.selectList(
                    new LambdaQueryWrapper<SysPermission>()
                            .inSql(SysPermission::getId,
                                    "SELECT permission_id FROM sys_role_permission WHERE role_id IN ("
                                            + roleIds.stream().map(id -> "'" + id + "'").collect(Collectors.joining(","))
                                            + ")")
                            .eq(SysPermission::getStatus, 1)
            );

            for (SysPermission perm : permissions) {
                authorities.add(new SimpleGrantedAuthority(perm.getCode()));
            }

            Map<String, String> permMap = new HashMap<>();
            for (SysPermission perm : permissions) {
                permMap.put(perm.getId(), perm.getCode());
            }
            for (SysRole role : roles) {
                permMap.put("role_" + role.getId(), "ROLE_" + role.getCode());
            }
            redisService.hSetAll(cacheKey, permMap);
            redisService.expire(cacheKey, PERMISSIONS_TTL_HOURS, TimeUnit.HOURS);
        }

        return authorities;
    }
}
