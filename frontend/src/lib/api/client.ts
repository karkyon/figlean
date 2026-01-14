/**
 * FIGLEAN Frontend - APIクライアント基盤
 * AxiosベースのHTTPクライアント設定
 * 
 * 【修正内容】2026-01-14
 * - API_URLとAPI_BASE_PATHの分離設定を統合
 * - NEXT_PUBLIC_API_URLに一本化（推奨設定）
 * - デフォルト値をlocalhost:3101/apiに変更
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '@/types/api';

// =====================================
// 定数
// =====================================

/**
 * APIベースURL
 * 環境変数NEXT_PUBLIC_API_URLから取得
 * デフォルト: http://localhost:3101/api
 * 
 * 【重要】環境変数設定例：
 * - 開発環境: NEXT_PUBLIC_API_URL=http://localhost:3101/api
 * - 本番環境: NEXT_PUBLIC_API_URL=https://api.figlean.com/api
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101/api';

// =====================================
// トークン管理
// =====================================

/**
 * トークンをローカルストレージに保存
 */
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

/**
 * トークンをローカルストレージから取得
 */
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

/**
 * トークンをローカルストレージから削除
 */
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
};

// =====================================
// Axiosインスタンス作成
// =====================================

/**
 * APIクライアントのAxiosインスタンス
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =====================================
// リクエストインターセプター
// =====================================

/**
 * リクエスト前処理
 * - 認証トークンを自動付与
 * - デバッグログ出力（開発環境のみ）
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // デバッグログ（開発環境のみ）
    if (process.env.NEXT_PUBLIC_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        headers: config.headers,
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// =====================================
// レスポンスインターセプター
// =====================================

/**
 * レスポンス後処理
 * - エラーハンドリング
 * - 401エラー時のトークンクリア＆リダイレクト
 * - デバッグログ出力（開発環境のみ）
 */
apiClient.interceptors.response.use(
  (response) => {
    // デバッグログ（開発環境のみ）
    if (process.env.NEXT_PUBLIC_ENV === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  (error: AxiosError<ApiError>) => {
    // デバッグログ
    console.error('[API Response Error]', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    // 401エラー（認証エラー）の場合、トークンを削除してログインページへ
    if (error.response?.status === 401) {
      removeAuthToken();
      
      // クライアントサイドでのみリダイレクト
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    // エラーレスポンスを返す
    return Promise.reject(error);
  }
);

// =====================================
// 初期化ログ（開発環境のみ）
// =====================================
if (process.env.NEXT_PUBLIC_ENV === 'development') {
  console.log('[API Client] Initialized with baseURL:', API_BASE_URL);
}

// =====================================
// エクスポート
// =====================================

export default apiClient;

// =====================================
// ヘルパー関数
// =====================================

/**
 * APIエラーメッセージを取得
 * @param error - エラーオブジェクト
 * @returns エラーメッセージ
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    
    if (axiosError.response?.data?.error?.message) {
      return axiosError.response.data.error.message;
    }
    
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'エラーが発生しました';
};

/**
 * APIエラーコードを取得
 * @param error - エラーオブジェクト
 * @returns エラーコード（存在しない場合はundefined）
 */
export const getErrorCode = (error: unknown): string | undefined => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data?.error?.code;
  }
  return undefined;
};