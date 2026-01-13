/**
 * FIGLEAN Frontend - 認証カスタムフック
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getAuthToken } from '@/lib/api/client';

/**
 * 認証状態を管理するカスタムフック
 */
export const useAuth = () => {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  } = useAuthStore();

  // 初回マウント時にトークンがあればユーザー情報を取得
  useEffect(() => {
    const token = getAuthToken();
    if (token && !user && !isLoading) {
      refreshUser().catch(() => {
        // トークンが無効な場合は何もしない（インターセプターで処理される）
      });
    }
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  };
};

/**
 * 認証が必要なページで使用するフック
 * 未認証の場合はログインページにリダイレクト
 */
export const useRequireAuth = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading, user };
};

/**
 * ゲストのみアクセス可能なページで使用するフック
 * 認証済みの場合はダッシュボードにリダイレクト
 */
export const useGuestOnly = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
};
