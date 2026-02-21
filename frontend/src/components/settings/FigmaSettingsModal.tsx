// frontend/src/components/settings/FigmaSettingsModal.tsx
/**
 * ファイルパス: frontend/src/components/settings/FigmaSettingsModal.tsx
 * 概要: Figma連携設定モーダル
 * 機能説明: Figmaトークンの登録・削除・状態確認をモーダル形式で提供
 * 作成日: 2026-01-17
 * 更新日: 2026-01-17
 * 更新理由: 単独ページからModal化、UI統一
 * 依存関係: @/components/ui/Modal, @/components/ui/Input, @/components/ui/Button, @/store/authStore
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';

interface FigmaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FigmaSettingsModal({
  isOpen,
  onClose,
  onSuccess,
}: FigmaSettingsModalProps) {
  const { user, refreshUser, saveFigmaToken, deleteFigmaToken } = useAuthStore();
  
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setToken('');
      setMessage(null);
      setShowToken(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSaveToken = async () => {
    if (!token.trim()) {
      setMessage({ type: 'error', text: 'トークンを入力してください' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await saveFigmaToken(token);  // ← これで内部的にrefreshUser()が呼ばれる
      setToken('');
      
      // ★ 修正: 成功後すぐにコールバックとモーダルを閉じる
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'トークンの保存に失敗しました' 
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Figma連携設定"
      size="lg"
    >
      <div className="space-y-6">
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="text-base font-bold text-yellow-900 mb-2">
                Figma API の制約について（重要）
              </h3>
              
              <div className="space-y-2 text-sm text-yellow-800">
                <div>
                  <p className="font-semibold mb-1">
                    📁 ファイル一覧の取得について
                  </p>
                  <p className="pl-4">
                    Figma APIでは、<strong>チームに所属していないアカウント</strong>はファイル一覧を取得できません。
                    個人アカウントやフリープランで利用している場合、ファイル一覧が表示されないことがあります。
                  </p>
                </div>

                <div>
                  <p className="font-semibold mb-1">
                    ✅ 解決方法
                  </p>
                  <ul className="list-disc list-inside pl-4 space-y-1 text-xs">
                    <li>
                      <strong>方法1:</strong> Figmaでチームを作成し、チームに参加する
                    </li>
                    <li>
                      <strong>方法2:</strong> プロジェクト作成時に「URL入力」タブからファイルURLを直接指定する（推奨）
                    </li>
                  </ul>
                </div>

                <div className="bg-white border border-yellow-300 rounded p-2 mt-2">
                  <p className="font-semibold text-yellow-900 mb-1 text-xs">
                    💡 おすすめの使い方
                  </p>
                  <p className="text-xs">
                    チーム未所属の場合でも、<strong>FigmaファイルのURLさえあれば</strong>プロジェクトを作成できます。
                    新規プロジェクト作成 → 「URL入力」タブ → FigmaファイルのURLを貼り付け
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">連携状態</h3>
          
          {user?.hasFigmaToken ? (
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-green-700 font-medium text-sm">Figmaトークン登録済み</span>
              </div>

              {user.figmaUserId && (
                <div className="text-sm text-gray-600">
                  <p>Figma User ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{user.figmaUserId}</code></p>
                </div>
              )}

              <Button
                onClick={handleDeleteToken}
                variant="secondary"
                isLoading={isLoading}
                className="bg-red-50 text-red-600 hover:bg-red-100 text-sm"
              >
                トークンを削除
              </Button>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
              <span className="text-gray-600 text-sm">Figmaトークンが登録されていません</span>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Figma Personal Access Token
          </h3>

          <div className="space-y-3">
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

          {message && (
            <div
              className={`mt-3 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-base font-semibold text-blue-900 mb-3">
            📖 Figma Personal Access Token の取得方法
          </h3>

          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>
              <strong>Figmaにログイン</strong>
              <br />
              <a
                href="https://www.figma.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline ml-4 text-xs"
              >
                https://www.figma.com/
              </a>
            </li>

            <li>
              <strong>Settings を開く</strong>
              <br />
              <span className="ml-4 text-xs">右上のアイコン → Settings</span>
            </li>

            <li>
              <strong>Personal access tokens に移動</strong>
              <br />
              <span className="ml-4 text-xs">左メニュー → Personal access tokens</span>
            </li>

            <li>
              <strong>新しいトークンを作成</strong>
              <br />
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-xs">
                <li>「Create new token」をクリック</li>
                <li>トークン名: <code className="bg-white px-1">FIGLEAN</code></li>
                <li>スコープ: <code className="bg-white px-1">File content (Read only)</code> を選択</li>
                <li>「Create token」をクリック</li>
              </ul>
            </li>

            <li>
              <strong>トークンをコピー</strong>
              <br />
              <span className="ml-4 text-xs">
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
              <span className="ml-4 text-xs">上のフォームにトークンを貼り付けて「トークンを保存」</span>
            </li>
          </ol>

          <div className="mt-3 p-2 bg-white border border-blue-300 rounded">
            <p className="text-xs text-blue-700">
              <strong>💡 ヒント:</strong> トークンは暗号化されてデータベースに保存されます。安全に管理されますのでご安心ください。
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}