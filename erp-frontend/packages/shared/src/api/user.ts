import { apiClient } from './client';
import type {
  PageResult,
  UserCreateRequest,
  UserQueryRequest,
  UserResponse,
  UserUpdateRequest,
} from '../types';

export const userApi = {
  list(params: UserQueryRequest & { pageNum: number; pageSize: number }): Promise<PageResult<UserResponse>> {
    return apiClient.get('/system/users', { params });
  },

  getById(id: string): Promise<UserResponse> {
    return apiClient.get(`/system/users/${id}`);
  },

  create(data: UserCreateRequest): Promise<UserResponse> {
    return apiClient.post('/system/users', data);
  },

  update(id: string, data: UserUpdateRequest): Promise<UserResponse> {
    return apiClient.put(`/system/users/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/system/users/${id}`);
  },

  resetPassword(id: string, newPassword: string): Promise<void> {
    return apiClient.put(`/system/users/${id}/reset-password`, { newPassword });
  },
};
