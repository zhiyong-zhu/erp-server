package com.erp.system.service;

import com.erp.common.core.page.PageQuery;
import com.erp.common.core.page.PageResult;
import com.erp.system.dto.user.UserCreateRequest;
import com.erp.system.dto.user.UserQueryRequest;
import com.erp.system.dto.user.UserResponse;
import com.erp.system.dto.user.UserUpdateRequest;

public interface SysUserService {

    PageResult<UserResponse> listUsers(UserQueryRequest query, PageQuery page);

    UserResponse getUserById(String id);

    UserResponse createUser(UserCreateRequest request);

    UserResponse updateUser(String id, UserUpdateRequest request);

    void deleteUser(String id);

    void resetPassword(String id, String newPassword);
}
