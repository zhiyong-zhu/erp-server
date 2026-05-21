import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

class MobileApiClient {
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
        const token = await AsyncStorage.getItem('access_token');
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
          await AsyncStorage.removeItem('access_token');
        }
        const message = (error.response?.data as ApiResponse)?.message || error.message || '请求失败';
        return Promise.reject(new Error(message));
      }
    );
  }

  public get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get<ApiResponse<T>>(url, config).then((res: AxiosResponse<ApiResponse<T>>) => res.data.data);
  }

  public post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post<ApiResponse<T>>(url, data, config).then((res: AxiosResponse<ApiResponse<T>>) => res.data.data);
  }

  public put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put<ApiResponse<T>>(url, data, config).then((res: AxiosResponse<ApiResponse<T>>) => res.data.data);
  }

  public delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete<ApiResponse<T>>(url, config).then((res: AxiosResponse<ApiResponse<T>>) => res.data.data);
  }
}

export const mobileClient = new MobileApiClient();
