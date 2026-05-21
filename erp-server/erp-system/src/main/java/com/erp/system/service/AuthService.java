package com.erp.system.service;

import com.erp.system.dto.auth.LoginRequest;
import com.erp.system.dto.auth.LoginResponse;
import com.erp.system.dto.auth.RefreshTokenRequest;
import com.erp.system.dto.auth.UserInfoResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    void logout(String userId);

    LoginResponse refreshToken(RefreshTokenRequest request);

    UserInfoResponse getCurrentUser(String userId);
}
