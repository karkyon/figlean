/**
 * FIGLEAN Frontend - Figma連携設定画面
 * パス: /settings/figma
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function FigmaSettingsPage() {
  const router = useRouter();
  const { user, saveFigmaToken, deleteFigmaToken } = useAuthStore();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // トークン保存
  const handleSaveToken = async () => {
    if (!token.trim()) {
      setMessage({ type: 'error', text: 'Figmaトークンを入力してください' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await saveFigmaToken(token);
      setMessage({ type: 'success', text: 'Figmaトークンを保存しました' });
      setToken('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Figmaトークンの保存に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  };

  // トークン削除
  const handleDeleteToken = async () => {
    if (!confirm('Figmaトークンを削除してもよろしいですか？')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await deleteFigmaToken();
      setMessage({ type: 'success', text: 'Figmaトークンを削除しました' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Figmaトークンの削除に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="h-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between px-6 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-2xl font-extrabold hover:text-gray-300 transition-colors"
          >
            FIGLEAN
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-sm text-gray-300">Figma連携設定</span>
        </div>
        <div className="bg-gray-700 px-3 py-1.5 rounded-full text-sm">
          {user?.name || user?.email}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-8 py-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
            Figma連携設定
          </h1>

          {/* 接続状態 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-gray-700">接続状態:</span>
              {user?.hasFigmaToken ? (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  接続済み
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  未接続
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Figmaトークンを設定すると、Figmaファイルにアクセスできるようになります
            </p>
          </div>

          {/* メッセージ表示 */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* トークン入力フォーム */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Figma Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              disabled={isLoading}
            />
            <p className="mt-2 text-xs text-gray-500">
              トークンは暗号化されて安全に保存されます
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleSaveToken}
              disabled={isLoading || !token.trim()}
              className="flex-1 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '保存中...' : 'トークンを保存'}
            </button>

            {user?.hasFigmaToken && (
              <button
                onClick={handleDeleteToken}
                disabled={isLoading}
                className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                削除
              </button>
            )}
          </div>

          {/* トークン取得方法 */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-bold text-blue-900 mb-3">
              📝 Figmaトークンの取得方法
            </h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Figmaにログインして <a href="https://www.figma.com/settings" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Settings</a> を開く</li>
              <li>「Personal access tokens」セクションに移動</li>
              <li>「Create new token」をクリック</li>
              <li>トークン名を入力（例: FIGLEAN）</li>
              <li>スコープで「File content - Read only」を選択</li>
              <li>生成されたトークンをコピーして上記に貼り付け</li>
            </ol>
          </div>

          {/* 戻るボタン */}
          <div className="mt-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← ダッシュボードに戻る
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
