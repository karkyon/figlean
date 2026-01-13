/**
 * FIGLEAN Frontend - Figmaファイル選択コンポーネント
 * ファイルパス: frontend/src/components/project/FigmaFileSelector.tsx
 * 
 * Figmaファイル一覧の表示と選択機能
 */

'use client';

import { useState, useEffect } from 'react';
import { getFigmaFiles } from '@/lib/api/figma';
import { LoadingSpinner } from '@/components/ui/Loading'; // Loading → LoadingSpinner に修正
import type { FigmaFile } from '@/types/figma';

// =====================================
// 型定義
// =====================================

interface FigmaFileSelectorProps {
  onSelect: (file: FigmaFile) => void;
  selectedFileKey?: string;
}

// =====================================
// メインコンポーネント
// =====================================

export function FigmaFileSelector({
  onSelect,
  selectedFileKey,
}: FigmaFileSelectorProps) {
  const [files, setFiles] = useState<FigmaFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // =====================================
  // Figmaファイル一覧取得
  // =====================================

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getFigmaFiles();
        setFiles(response.files);
      } catch (err) {
        console.error('Figmaファイル一覧取得エラー:', err);
        setError(
          'Figmaファイルの取得に失敗しました。Figmaアカウントが接続されているか確認してください。'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, []);

  // =====================================
  // フィルタリング
  // =====================================

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // =====================================
  // レンダリング: ローディング
  // =====================================

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Figmaファイルを読み込み中...</p>
      </div>
    );
  }

  // =====================================
  // レンダリング: エラー
  // =====================================

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <span className="text-2xl mr-3">⚠️</span>
          <div>
            <h4 className="font-semibold text-red-900 mb-2">
              ファイルの読み込みに失敗
            </h4>
            <p className="text-sm text-red-700">{error}</p>
            <div className="mt-4">
              <a
                href="/settings/figma"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Figma設定ページへ
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================
  // レンダリング: ファイル一覧なし
  // =====================================

  if (files.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <span className="text-4xl mb-4 block">📁</span>
        <h4 className="font-semibold text-gray-900 mb-2">
          Figmaファイルが見つかりません
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Figmaアカウントにファイルがないか、アクセス権限がない可能性があります。
        </p>
        <a
          href="https://www.figma.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Figmaでファイルを作成 →
        </a>
      </div>
    );
  }

  // =====================================
  // レンダリング: ファイル一覧
  // =====================================

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ファイル名で検索..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ファイル一覧 */}
      <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            検索結果が見つかりません
          </div>
        ) : (
          filteredFiles.map((file) => (
            <button
              key={file.key}
              onClick={() => onSelect(file)}
              className={`
                w-full flex items-center p-4 rounded-lg border-2 text-left transition-all
                ${
                  selectedFileKey === file.key
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }
              `}
            >
              {/* サムネイル */}
              <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded mr-4 overflow-hidden">
                {file.thumbnail_url ? (
                  <img
                    src={file.thumbnail_url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    🎨
                  </div>
                )}
              </div>

              {/* ファイル情報 */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">
                  {file.name}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  最終更新: {new Date(file.last_modified).toLocaleDateString('ja-JP')}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  Key: {file.key}
                </p>
              </div>

              {/* 選択インジケーター */}
              {selectedFileKey === file.key && (
                <div className="flex-shrink-0 ml-4">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* ファイル数表示 */}
      <div className="text-sm text-gray-500 text-center pt-2 border-t">
        {filteredFiles.length} 件のファイル
        {searchQuery && ` (検索: "${searchQuery}")`}
      </div>
    </div>
  );
}