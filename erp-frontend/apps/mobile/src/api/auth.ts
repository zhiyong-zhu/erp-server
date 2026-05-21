import { mobileClient } from './client';
import type { LoginRequest, LoginResponse, User } from '@erp/shared';

export const mobileAuthApi = {
  login(data: LoginRequest): Promise<LoginResponse> {
    return mobileClient.post<LoginResponse>('/auth/login', data);
  },

  logout(): Promise<void> {
    return mobileClient.post<void>('/auth/logout');
  },

  refreshToken(refreshToken: string): Promise<LoginResponse> {
    return mobileClient.post<LoginResponse>('/auth/refresh', { refreshToken });
  },

  getUserInfo(): Promise<User> {
    return mobileClient.get<User>('/auth/userinfo');
  },
};
