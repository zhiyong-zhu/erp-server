import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getTokenStorage } from '../storage';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

// Vite injects import.meta.env at build time; in other environments this is tree-shaken away
// @ts-ignore
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : '/api/v1';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      async (config) => {
        const token = await getTokenStorage().getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.instance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const { data } = response;
        if (data.code !== 200) {
          return Promise.reject(new Error(data.message));
        }
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await getTokenStorage().removeItem('access_token');
          if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/login';
          }
        }
        const message = (error.response?.data as ApiResponse)?.message || error.message || '请求失败';
        return Promise.reject(new Error(message));
      }
    );
  }

  public get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get<ApiResponse<T>>(url, config).then((res) => res.data.data);
  }

  public post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post<ApiResponse<T>>(url, data, config).then((res) => res.data.data);
  }

  public put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put<ApiResponse<T>>(url, data, config).then((res) => res.data.data);
  }

  public delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete<ApiResponse<T>>(url, config).then((res) => res.data.data);
  }

  public getAxiosInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient();
