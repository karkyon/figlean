/**
 * FIGLEAN Frontend - Figmaプレビュー表示コンポーネント
 * ファイルパス: frontend/src/components/figma/FigmaPreview.tsx
 * 
 * 機能:
 * - Figmaファイルのサムネイル表示
 * - ノードレベルのプレビュー
 * - エラー時の代替表示
 * 
 * 作成日: 2026年1月15日
 */

'use client';

import { useState, useEffect } from 'react';
import { getFigmaFileDetails } from '@/lib/api/figma';

// =====================================
// 型定義
// =====================================

interface FigmaPreviewProps {
  fileKey: string;
  nodeId?: string;
  scale?: number;
  format?: 'jpg' | 'png' | 'svg';
  className?: string;
}

// =====================================
// メインコンポーネント
// =====================================

export function FigmaPreview({
  fileKey,
  nodeId,
  scale = 1,
  format = 'png',
  className = '',
}: FigmaPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =====================================
  // プレビュー画像取得
  // =====================================

  useEffect(() => {
    fetchPreview();
  }, [fileKey, nodeId, scale, format]);

  const fetchPreview = async () => {
    if (!fileKey) {
      setError('ファイルキーが指定されていません');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Figma API経由でプレビュー画像を取得
      const params = new URLSearchParams({
        scale: scale.toString(),
        format: format,
      });

      if (nodeId) {
        params.append('ids', nodeId);
      }

      const url = `https://api.figma.com/v1/images/${fileKey}?${params.toString()}`;
      
      // バックエンドAPI経由でプロキシリクエスト
      const response = await fetch(`/api/figma/preview?fileKey=${fileKey}&nodeId=${nodeId || ''}&scale=${scale}&format=${format}`);
      
      if (!response.ok) {
        throw new Error('プレビュー画像の取得に失敗しました');
      }

      const data = await response.json();
      
      if (data.success && data.data.imageUrl) {
        setImageUrl(data.data.imageUrl);
      } else {
        throw new Error('プレビュー画像URLが取得できませんでした');
      }
    } catch (error: any) {
      console.error('Figmaプレビュー取得エラー:', error);
      setError(error.message || 'プレビューの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================
  // レンダリング
  // =====================================

  return (
    <div className={`relative ${className}`}>
      {/* ローディング状態 */}
      {isLoading && (
        <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-sm text-gray-600">読み込み中...</p>
          </div>
        </div>
      )}

      {/* エラー状態 */}
      {!isLoading && error && (
        <div className="flex items-center justify-center h-48 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center px-4">
            <span className="text-3xl mb-2 block">⚠️</span>
            <p className="text-sm text-red-800 font-semibold mb-1">
              プレビューを読み込めませんでした
            </p>
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={fetchPreview}
              className="mt-3 text-xs text-red-600 hover:text-red-800 underline font-semibold"
            >
              再試行
            </button>
          </div>
        </div>
      )}

      {/* プレビュー画像 */}
      {!isLoading && !error && imageUrl && (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white">
          <img
            src={imageUrl}
            alt="Figma Preview"
            className="w-full h-auto"
            onError={() => {
              setError('画像の読み込みに失敗しました');
              setImageUrl(null);
            }}
          />
          {/* Figmaで開くボタン */}
          <div className="absolute top-2 right-2">
            <a
              href={`https://www.figma.com/file/${fileKey}${nodeId ? `?node-id=${nodeId}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1"
            >
              <span>🎨</span>
              <span>Figmaで開く</span>
            </a>
          </div>
        </div>
      )}

      {/* 代替表示（画像なし） */}
      {!isLoading && !error && !imageUrl && (
        <div className="flex items-center justify-center h-48 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-center">
            <span className="text-4xl mb-2 block">🎨</span>
            <p className="text-sm text-gray-600">プレビューなし</p>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================
// コンパクトバージョン（サムネイル用）
// =====================================

interface FigmaThumbnailProps {
  fileKey: string;
  fileName?: string;
  className?: string;
}

export function FigmaThumbnail({
  fileKey,
  fileName,
  className = '',
}: FigmaThumbnailProps) {
  return (
    <div className={`relative ${className}`}>
      <FigmaPreview
        fileKey={fileKey}
        scale={0.5}
        format="jpg"
        className="w-full h-32 object-cover"
      />
      {fileName && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
          <p className="text-xs text-white font-semibold truncate">{fileName}</p>
        </div>
      )}
    </div>
  );
}