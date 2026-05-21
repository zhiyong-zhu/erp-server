package com.erp.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.erp.common.core.exception.BizException;
import com.erp.common.core.page.PageQuery;
import com.erp.common.core.page.PageResult;
import com.erp.common.core.result.ErrorCode;
import com.erp.common.redis.service.RedisService;
import com.erp.system.dto.user.UserCreateRequest;
import com.erp.system.dto.user.UserQueryRequest;
import com.erp.system.dto.user.UserResponse;
import com.erp.system.dto.user.UserUpdateRequest;
import com.erp.system.entity.SysDepartment;
import com.erp.system.entity.SysRole;
import com.erp.system.entity.SysUser;
import com.erp.system.entity.SysUserRole;
import com.erp.system.mapper.SysDepartmentMapper;
import com.erp.system.mapper.SysRoleMapper;
import com.erp.system.mapper.SysUserMapper;
import com.erp.system.mapper.SysUserRoleMapper;
import com.erp.system.service.SysUserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SysUserServiceImpl implements SysUserService {

    private static final String USER_PERMISSIONS_KEY = "user:permissions:";

    private final SysUserMapper sysUserMapper;
    private final SysUserRoleMapper sysUserRoleMapper;
    private final SysRoleMapper sysRoleMapper;
    private final SysDepartmentMapper sysDepartmentMapper;
    private final PasswordEncoder passwordEncoder;
    private final RedisService redisService;

    public SysUserServiceImpl(SysUserMapper sysUserMapper,
                              SysUserRoleMapper sysUserRoleMapper,
                              SysRoleMapper sysRoleMapper,
                              SysDepartmentMapper sysDepartmentMapper,
                              PasswordEncoder passwordEncoder,
                              RedisService redisService) {
        this.sysUserMapper = sysUserMapper;
        this.sysUserRoleMapper = sysUserRoleMapper;
        this.sysRoleMapper = sysRoleMapper;
        this.sysDepartmentMapper = sysDepartmentMapper;
        this.passwordEncoder = passwordEncoder;
        this.redisService = redisService;
    }

    @Override
    public PageResult<UserResponse> listUsers(UserQueryRequest query, PageQuery page) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<SysUser>()
                .like(StringUtils.hasText(query.getUsername()), SysUser::getUsername, query.getUsername())
                .like(StringUtils.hasText(query.getRealName()), SysUser::getRealName, query.getRealName())
                .like(StringUtils.hasText(query.getPhone()), SysUser::getPhone, query.getPhone())
                .eq(query.getStatus() != null, SysUser::getStatus, query.getStatus())
                .eq(StringUtils.hasText(query.getDepartmentId()), SysUser::getDepartmentId, query.getDepartmentId())
                .orderByDesc(SysUser::getCreatedAt);

        Page<SysUser> pageResult = sysUserMapper.selectPage(
                new Page<>(page.getPageNum(), page.getPageSize()), wrapper);

        List<UserResponse> users = pageResult.getRecords().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return PageResult.of(users, pageResult.getTotal(), page.getPageNum(), page.getPageSize());
    }

    @Override
    public UserResponse getUserById(String id) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) {
            throw new BizException(ErrorCode.RESOURCE_NOT_FOUND, "用户不存在");
        }
        return toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse createUser(UserCreateRequest request) {
        Long count = sysUserMapper.selectCount(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, request.getUsername()));
        if (count > 0) {
            throw new BizException(ErrorCode.PARAM_ERROR, "用户名已存在");
        }

        SysUser user = new SysUser();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRealName(request.getRealName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());
        user.setDepartmentId(request.getDepartmentId());
        user.setStatus(1);
        sysUserMapper.insert(user);

        if (request.getRoleIds() != null && !request.getRoleIds().isEmpty()) {
            assignRoles(user.getId(), request.getRoleIds());
        }

        return toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateUser(String id, UserUpdateRequest request) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) {
            throw new BizException(ErrorCode.RESOURCE_NOT_FOUND, "用户不存在");
        }

        if (request.getRealName() != null) {
            user.setRealName(request.getRealName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if (request.getAvatar() != null) {
            user.setAvatar(request.getAvatar());
        }
        if (request.getDepartmentId() != null) {
            user.setDepartmentId(request.getDepartmentId());
        }
        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }
        sysUserMapper.updateById(user);

        if (request.getRoleIds() != null) {
            sysUserRoleMapper.delete(
                    new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, id));
            if (!request.getRoleIds().isEmpty()) {
                assignRoles(id, request.getRoleIds());
            }
            redisService.delete(USER_PERMISSIONS_KEY + id);
        }

        return toResponse(user);
    }

    @Override
    @Transactional
    public void deleteUser(String id) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) {
            throw new BizException(ErrorCode.RESOURCE_NOT_FOUND, "用户不存在");
        }
        sysUserMapper.deleteById(id);
        sysUserRoleMapper.delete(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, id));
        redisService.delete(USER_PERMISSIONS_KEY + id);
    }

    @Override
    public void resetPassword(String id, String newPassword) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) {
            throw new BizException(ErrorCode.RESOURCE_NOT_FOUND, "用户不存在");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        sysUserMapper.updateById(user);
    }

    private void assignRoles(String userId, List<String> roleIds) {
        for (String roleId : roleIds) {
            SysUserRole userRole = new SysUserRole();
            userRole.setUserId(userId);
            userRole.setRoleId(roleId);
            sysUserRoleMapper.insert(userRole);
        }
    }

    private UserResponse toResponse(SysUser user) {
        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setRealName(user.getRealName());
        response.setPhone(user.getPhone());
        response.setEmail(user.getEmail());
        response.setAvatar(user.getAvatar());
        response.setDepartmentId(user.getDepartmentId());
        response.setStatus(user.getStatus());
        response.setLastLoginAt(user.getLastLoginAt());
        response.setCreatedAt(user.getCreatedAt());

        if (StringUtils.hasText(user.getDepartmentId())) {
            SysDepartment dept = sysDepartmentMapper.selectById(user.getDepartmentId());
            if (dept != null) {
                response.setDepartmentName(dept.getName());
            }
        }

        List<SysUserRole> userRoles = sysUserRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, user.getId()));
        if (!userRoles.isEmpty()) {
            List<String> roleIds = userRoles.stream().map(SysUserRole::getRoleId).collect(Collectors.toList());
            List<SysRole> roles = sysRoleMapper.selectBatchIds(roleIds);
            response.setRoleIds(roleIds);
            response.setRoleNames(roles.stream().map(SysRole::getName).collect(Collectors.toList()));
        } else {
            response.setRoleIds(new ArrayList<>());
            response.setRoleNames(new ArrayList<>());
        }

        return response;
    }
}
