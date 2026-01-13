/**
 * FIGLEAN Frontend - 認証保護コンポーネント
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getAuthToken } from '@/lib/api/client';

// =====================================
// 認証保護コンポーネント
// =====================================

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 認証が必要なページを保護するコンポーネント
 * 未認証の場合はログインページにリダイレクト
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback = <LoadingSpinner /> 
}) => {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshUser } = useAuthStore();

  useEffect(() => {
    const token = getAuthToken();
    
    // トークンがある場合はユーザー情報を取得
    if (token && !isAuthenticated && !isLoading) {
      refreshUser().catch(() => {
        router.push('/login');
      });
    }
    
    // トークンがない場合はログインページへ
    if (!token && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, refreshUser]);

  // ローディング中
  if (isLoading) {
    return <>{fallback}</>;
  }

  // 未認証の場合は何も表示しない（リダイレクト中）
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // 認証済みの場合は子要素を表示
  return <>{children}</>;
};

/**
 * ゲストのみアクセス可能なページを保護するコンポーネント
 * 認証済みの場合はダッシュボードにリダイレクト
 */
export const GuestGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback = <LoadingSpinner /> 
}) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // ローディング中
  if (isLoading) {
    return <>{fallback}</>;
  }

  // 認証済みの場合は何も表示しない（リダイレクト中）
  if (isAuthenticated) {
    return <>{fallback}</>;
  }

  // 未認証の場合は子要素を表示
  return <>{children}</>;
};

// =====================================
// ローディングスピナー
// =====================================

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
};
