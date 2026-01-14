/**
 * FIGLEAN Frontend - Figma連携設定ページ
 * ファイルパス: frontend/src/app/(protected)/settings/figma/page.tsx
 * 
 * 機能:
 * - Figmaトークンの登録・削除
 * - トークン状態の確認
 * - API制約の説明
 * 
 * 更新日: 2026年1月13日 - API制約説明追加
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function FigmaSettingsPage() {
  const { user, refreshUser, saveFigmaToken, deleteFigmaToken } = useAuthStore();
  
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showToken, setShowToken] = useState(false);

  // =====================================
  // トークン保存
  // =====================================

  const handleSaveToken = async () => {
    if (!token.trim()) {
      setMessage({ type: 'error', text: 'トークンを入力してください' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await saveFigmaToken(token);
      setMessage({ type: 'success', text: 'Figmaトークンを保存しました' });
      setToken('');
      await refreshUser();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'トークンの保存に失敗しました' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================
  // トークン削除
  // =====================================

  const handleDeleteToken = async () => {
    if (!confirm('Figmaトークンを削除してもよろしいですか？')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await deleteFigmaToken();
      setMessage({ type: 'success', text: 'Figmaトークンを削除しました' });
      await refreshUser();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'トークンの削除に失敗しました' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================
  // メッセージ自動削除
  // =====================================

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // =====================================
  // レンダリング
  // =====================================

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Figma連携設定</h1>

      {/* =====================================
          API制約の説明（重要）
          ===================================== */}
      <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
        <div className="flex items-start">
          <span className="text-3xl mr-3">⚠️</span>
          <div>
            <h2 className="text-lg font-bold text-yellow-900 mb-3">
              Figma API の制約について（重要）
            </h2>
            
            <div className="space-y-3 text-sm text-yellow-800">
              <div>
                <p className="font-semibold mb-1">
                  📁 ファイル一覧の取得について
                </p>
                <p className="pl-4">
                  Figma APIでは、<strong>チームに所属していないアカウント</strong>はファイル一覧を取得できません。
                  <br />
                  個人アカウントやフリープランで利用している場合、ファイル一覧が表示されないことがあります。
                </p>
              </div>

              <div>
                <p className="font-semibold mb-1">
                  ✅ 解決方法
                </p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>
                    <strong>方法1:</strong> Figmaでチームを作成し、チームに参加する
                  </li>
                  <li>
                    <strong>方法2:</strong> プロジェクト作成時に「URL入力」タブからファイルURLを直接指定する（推奨）
                  </li>
                </ul>
              </div>

              <div className="bg-white border border-yellow-300 rounded p-3 mt-3">
                <p className="font-semibold text-yellow-900 mb-1">
                  💡 おすすめの使い方
                </p>
                <p className="text-xs">
                  チーム未所属の場合でも、<strong>FigmaファイルのURLさえあれば</strong>プロジェクトを作成できます。
                  <br />
                  新規プロジェクト作成 → 「URL入力」タブ → FigmaファイルのURLを貼り付け
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================
          トークン状態表示
          ===================================== */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">連携状態</h2>
        
        {user?.hasFigmaToken ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-green-700 font-medium">Figmaトークンを保存しました</span>
            </div>

            {user.figmaUserId && (
              <div className="text-sm text-gray-600">
                <p>Figma User ID: <code className="bg-gray-100 px-2 py-1 rounded">{user.figmaUserId}</code></p>
              </div>
            )}

            <Button
              onClick={handleDeleteToken}
              variant="secondary"
              isLoading={isLoading}
              className="bg-red-50 text-red-600 hover:bg-red-100"
            >
              トークンを削除
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
            <span className="text-gray-600">Figmaトークンが登録されていません</span>
          </div>
        )}
      </div>

      {/* =====================================
          トークン登録フォーム
          ===================================== */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Figma Personal Access Token
        </h2>

        <div className="space-y-4">
          <Input
            label="Figma Personal Access Token"
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="figd_xxxxxxxxxxxxxxxxxxxx"
            required
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showToken"
              checked={showToken}
              onChange={(e) => setShowToken(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="showToken" className="text-sm text-gray-600">
              トークンを表示する
            </label>
          </div>

          <Button
            onClick={handleSaveToken}
            isLoading={isLoading}
            disabled={!token.trim() || isLoading}
            className="w-full"
          >
            トークンを保存
          </Button>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* =====================================
          トークン取得方法
          ===================================== */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">
          📖 Figma Personal Access Token の取得方法
        </h2>

        <ol className="list-decimal list-inside space-y-3 text-sm text-blue-800">
          <li>
            <strong>Figmaにログイン</strong>
            <br />
            <a
              href="https://www.figma.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline ml-4"
            >
              https://www.figma.com/
            </a>
          </li>

          <li>
            <strong>Settings を開く</strong>
            <br />
            <span className="ml-4">右上のアイコン → Settings</span>
          </li>

          <li>
            <strong>Personal access tokens に移動</strong>
            <br />
            <span className="ml-4">左メニュー → Personal access tokens</span>
          </li>

          <li>
            <strong>新しいトークンを作成</strong>
            <br />
            <ul className="list-disc list-inside ml-8 mt-1 space-y-1">
              <li>「Create new token」をクリック</li>
              <li>トークン名: <code className="bg-white px-1">FIGLEAN</code></li>
              <li>スコープ: <code className="bg-white px-1">File content (Read only)</code> を選択</li>
              <li>「Create token」をクリック</li>
            </ul>
          </li>

          <li>
            <strong>トークンをコピー</strong>
            <br />
            <span className="ml-4">
              <code className="bg-white px-1">figd_...</code> で始まるトークンをコピー
            </span>
            <br />
            <span className="ml-4 text-xs text-red-600">
              ⚠️ このトークンは二度と表示されないので、必ずコピーしてください
            </span>
          </li>

          <li>
            <strong>FIGLEANに設定</strong>
            <br />
            <span className="ml-4">上のフォームにトークンを貼り付けて「トークンを保存」</span>
          </li>
        </ol>

        <div className="mt-4 p-3 bg-white border border-blue-300 rounded">
          <p className="text-xs text-blue-700">
            <strong>💡 ヒント:</strong> トークンは暗号化されてデータベースに保存されます。安全に管理されますのでご安心ください。
          </p>
        </div>
      </div>
    </div>
  );
}