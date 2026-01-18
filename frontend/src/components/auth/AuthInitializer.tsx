/**
 * ファイルパス: frontend/src/components/auth/AuthInitializer.tsx
 * 概要: 認証状態の初期化コンポーネント
 * 機能説明: アプリ起動時に認証状態をチェック
 * 作成日: 2026-01-18
 * 依存関係: @/store/authStore, next/navigation
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePathname, useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/api/client';

export function AuthInitializer() {
  const pathname = usePathname();
  const router = useRouter();
  const { refreshUser, isAuthenticated, setUser } = useAuthStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    // 初回のみ実行
    if (isInitialized.current) return;
    isInitialized.current = true;

    const token = getAuthToken();
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isProtectedPage = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/projects') || 
                           pathname.startsWith('/settings');

    console.log('[AuthInitializer] 初期化開始', {
      pathname,
      hasToken: !!token,
      isAuthPage,
      isProtectedPage,
      isAuthenticated,
    });

    // ケース1: トークンがない
    if (!token) {
      console.warn('[AuthInitializer] ⚠️ トークンが見つかりません');
      
      // Zustand の状態をクリア
      setUser(null);
      
      // 保護されたページにいる場合はログインにリダイレクト
      if (isProtectedPage) {
        console.warn('[AuthInitializer] 🔒 保護されたページ → /login にリダイレクト');
        router.replace('/login');
      }
      return;
    }

    // ケース2: トークンがあり、認証ページにいる
    if (isAuthPage && isAuthenticated) {
      console.log('[AuthInitializer] ✅ 既にログイン済み → /dashboard にリダイレクト');
      router.replace('/dashboard');
      return;
    }

    // ケース3: トークンがあり、保護されたページにいる
    if (isProtectedPage) {
      console.log('[AuthInitializer] 🔄 ユーザー情報を検証中...');
      
      refreshUser()
        .then(() => {
          console.log('[AuthInitializer] ✅ ユーザー情報検証成功');
        })
        .catch((error) => {
          console.error('[AuthInitializer] ❌ ユーザー情報検証失敗:', error);
          console.warn('[AuthInitializer] 🔒 トークンが無効 → /login にリダイレクト');
          router.replace('/login');
        });
    }
  }, []); // 空の依存配列で初回のみ実行

  return null;
}