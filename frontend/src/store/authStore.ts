/**
 * FIGLEAN Frontend - 認証状態管理
 * Zustandを使用した認証状態の管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/models';
import * as authApi from '@/lib/api/auth';

// =====================================
// 型定義
// =====================================

interface AuthState {
  // 状態
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // アクション
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  saveFigmaToken: (token: string) => Promise<void>;
  deleteFigmaToken: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

// =====================================
// Zustand Store
// =====================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初期状態
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ログイン
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || 'ログインに失敗しました';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // ユーザー登録
      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register({ email, password, name });
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || '登録に失敗しました';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // ログアウト
      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch (error) {
          console.error('ログアウトエラー:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // ユーザー情報を再取得
      refreshUser: async () => {
        set({ isLoading: true });
        try {
          const user = await authApi.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'ユーザー情報の取得に失敗しました',
          });
          throw error;
        }
      },

      // Figmaトークン保存
      saveFigmaToken: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.saveFigmaToken(token);
          // ユーザー情報を更新
          await get().refreshUser();
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || 'Figmaトークンの保存に失敗しました';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Figmaトークン削除
      deleteFigmaToken: async () => {
        set({ isLoading: true, error: null });
        try {
          await authApi.deleteFigmaToken();
          // ユーザー情報を更新
          await get().refreshUser();
        } catch (error: any) {
          const errorMessage = error.response?.data?.error?.message || 'Figmaトークンの削除に失敗しました';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // エラークリア
      clearError: () => {
        set({ error: null });
      },

      // ユーザー設定（外部から）
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'figlean-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
