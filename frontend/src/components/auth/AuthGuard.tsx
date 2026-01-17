/**
 * FIGLEAN Frontend - 認証保護コンポーネント
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * ゲストユーザー専用ガード
 * ログイン済みユーザーを /dashboard にリダイレクト
 */
export function GuestGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // ★重要: ローディング中は何もしない
    if (isLoading) return;

    // ★修正: 既にログイン済みの場合のみリダイレクト
    if (isAuthenticated) {
      console.log('[GuestGuard] Already authenticated, redirecting to /dashboard');
      router.replace('/dashboard'); // ★push ではなく replace を使用
    }
  }, [isAuthenticated, isLoading, router]);

  // ★重要: ローディング中や認証済みの場合は何も表示しない
  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

/**
 * ログイン必須ガード
 * 未ログインユーザーを /login にリダイレクト
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // ★重要: ローディング中は何もしない
    if (isLoading) return;

    if (!isAuthenticated) {
      console.log('[AuthGuard] Not authenticated, redirecting to /login');
      router.replace('/login'); // ★push ではなく replace を使用
    }
  }, [isAuthenticated, isLoading, router]);

  // ★重要: ローディング中は何も表示しない
  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

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
