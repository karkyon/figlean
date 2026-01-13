/**
 * FIGLEAN Frontend - トップページ（ランディングページ）
 * パス: /
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  // 認証済みの場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isAuthenticated && !isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-extrabold text-gray-900">FIGLEAN</div>
          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              ログイン
            </a>
            <a
              href="/register"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              無料で始める
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
            Figmaデザインを診断して
            <br />
            最適なHTMLを生成
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            FIGLEAN適合度をスコア化し、プロダクションレディなコードを自動生成
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/register')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              無料で始める
            </button>
            <button
              onClick={() => router.push('/login')}
              className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold border-2 border-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              ログイン
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              設計品質診断
            </h3>
            <p className="text-gray-600">
              Figmaデザインを分析してスコア算出
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">高速HTML生成</h3>
            <p className="text-gray-600">
              90点以上で自動生成可能
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              崩れ予測
            </h3>
            <p className="text-gray-600">
              レスポンシブ対応の問題を事前に検出
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button
            onClick={() => router.push('/register')}
            className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
          >
            無料で始める
          </button>
          <p className="mt-4 text-sm text-gray-600">
            すでにアカウントをお持ちの方は{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-indigo-600 font-semibold hover:underline"
            >
              ログイン
            </button>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white text-center py-6 mt-16">
        <p className="text-sm">© 2026 FIGLEAN. All rights reserved.</p>
      </footer>
    </div>
  );
}