// =====================================
// ファイルパス: frontend/src/components/layout/DashboardHeader.tsx
// 概要: ダッシュボードヘッダー（ユーザーメニュー付き）
// 機能説明: ログインユーザー情報表示、設定、ログアウト機能
// 作成日: 2026-01-17
// 更新日: 2026-01-17 - 初回作成
// 依存関係: @/store/authStore, next/navigation
// =====================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function DashboardHeader() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleSettings = () => {
    setIsUserMenuOpen(false);
    router.push('/settings');
  };

  // ユーザー名の頭文字を取得（アバター用）
  const getUserInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        {/* ロゴ */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            FIGLEAN
          </button>
        </div>

        {/* 右側: Figma接続状態 + ユーザーメニュー */}
        <div className="flex items-center gap-4">
          {/* Figma接続状態 */}
          {user?.hasFigmaToken ? (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-200">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
              Figma Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              Figma Not Connected
            </div>
          )}

          {/* ユーザーメニュー */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* アバター */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {getUserInitial()}
              </div>

              {/* ユーザー名 */}
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium text-gray-900">
                  {user?.name || '管理者テストユーザー'}
                </div>
                <div className="text-xs text-gray-500">
                  {user?.plan || '管理者'}
                </div>
              </div>

              {/* 矢印アイコン */}
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  isUserMenuOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* ドロップダウンメニュー */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* ユーザー情報ヘッダー */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="font-medium text-gray-900">
                    {user?.name || '管理者テストユーザー'}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {user?.email || 'admin@test.com'}
                  </div>
                </div>

                {/* メニューアイテム */}
                <button
                  onClick={handleSettings}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">設定</span>
                </button>

                <div className="border-t border-gray-100 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-600">ログアウト</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}