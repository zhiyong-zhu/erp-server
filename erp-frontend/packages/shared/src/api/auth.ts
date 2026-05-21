import { apiClient } from './client';
import type { LoginRequest, LoginResponse, User } from '../types';

export const authApi = {
  login(data: LoginRequest): Promise<LoginResponse> {
    return apiClient.post('/auth/login', data);
  },

  logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },

  refreshToken(refreshToken: string): Promise<LoginResponse> {
    return apiClient.post('/auth/refresh', { refreshToken });
  },

  getUserInfo(): Promise<User> {
    return apiClient.get('/auth/userinfo');
  },
};
