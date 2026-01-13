/**
 * FIGLEAN Frontend - 認証API
 */

import apiClient, { setAuthToken, removeAuthToken } from './client';
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ChangePasswordRequest,
  SaveFigmaTokenRequest,
  RefreshTokenResponse,
} from '@/types/api';
import { User } from '@/types/models';

// =====================================
// 認証API
// =====================================

/**
 * ログイン
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/auth/login',
    data
  );
  
  // トークンを保存
  if (response.data.success) {
    setAuthToken(response.data.data.token);
  }
  
  return response.data.data;
};

/**
 * ログアウト
 */
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    // トークンを削除（APIエラーでも削除）
    removeAuthToken();
  }
};

/**
 * ユーザー登録
 */
export const register = async (data: RegisterRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/auth/register',
    data
  );
  
  // 登録後、自動的にログイン状態にする
  if (response.data.success) {
    setAuthToken(response.data.data.token);
  }
  
  return response.data.data;
};

/**
 * パスワード変更
 */
export const changePassword = async (
  data: ChangePasswordRequest
): Promise<void> => {
  await apiClient.post<ApiResponse<void>>('/auth/change-password', data);
};

/**
 * Figmaトークン保存
 */
export const saveFigmaToken = async (token: string): Promise<void> => {
  await apiClient.post<ApiResponse<void>>('/auth/figma-token', { token });
};

/**
 * Figmaトークン削除
 */
export const deleteFigmaToken = async (): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>('/auth/figma-token');
};

/**
 * トークンリフレッシュ
 */
export const refreshToken = async (): Promise<string> => {
  const response = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
    '/auth/refresh'
  );
  
  // 新しいトークンを保存
  if (response.data.success) {
    setAuthToken(response.data.data.token);
    return response.data.data.token;
  }
  
  throw new Error('トークンのリフレッシュに失敗しました');
};

/**
 * 現在のユーザー情報取得
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me');
  return response.data.data;
};

/**
 * 認証状態チェック
 */
export const checkAuth = async (): Promise<boolean> => {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
};
