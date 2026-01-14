/**
 * FIGLEAN Frontend - Figmaファイル選択コンポーネント
 * ファイルパス: frontend/src/components/project/FigmaFileSelector.tsx
 * 
 * 機能:
 * 1. Figmaファイル一覧から選択（チーム所属ユーザー）
 * 2. URL直接入力（個人ユーザー、チーム未所属ユーザー）
 * 
 * 作成日: 2026年1月13日
 */

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// =====================================
// 型定義
// =====================================

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url: string | null;
  last_modified: string;
}

interface FigmaFileSelectorProps {
  onSelect: (file: { key: string; name: string; url: string }) => void;
  selectedFileKey: string;
}

type SelectionMode = 'list' | 'url';

// =====================================
// メインコンポーネント
// =====================================

export function FigmaFileSelector({
  onSelect,
  selectedFileKey,
}: FigmaFileSelectorProps) {
  // =====================================
  // State管理
  // =====================================
  
  const [mode, setMode] = useState<SelectionMode>('list');
  const [files, setFiles] = useState<FigmaFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // URL入力用
  const [figmaUrl, setFigmaUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // =====================================
  // ファイル一覧取得
  // =====================================

  useEffect(() => {
    if (mode === 'list') {
      fetchFiles();
    }
  }, [mode]);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/figma/files', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'ファイル取得に失敗しました');
      }

      const data = await response.json();
      setFiles(data.data?.files || []);

      // ファイルが0件の場合、URL入力モードに切り替え
      if (!data.data?.files || data.data.files.length === 0) {
        setError(
          'Figmaファイルが見つかりませんでした。Figmaでチームに参加するか、下記のURL入力方式をご利用ください。'
        );
      }
    } catch (err: any) {
      console.error('Figmaファイル取得エラー:', err);
      
      // チーム未所属エラーの場合、わかりやすいメッセージを表示
      if (err.message.includes('トークン')) {
        setError('Figmaトークンが登録されていません。設定ページでトークンを登録してください。');
      } else {
        setError(
          'Figmaファイルの取得に失敗しました。\n\n' +
          '【よくある原因】\n' +
          '・Figmaでチームに所属していない（個人アカウント）\n' +
          '・トークンの権限不足\n\n' +
          '→ 下記の「URL入力」タブから直接ファイルURLを指定してください。'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================
  // ファイル選択
  // =====================================

  const handleFileSelect = (file: FigmaFile) => {
    onSelect({
      key: file.key,
      name: file.name,
      url: `https://www.figma.com/file/${file.key}`,
    });
  };

  // =====================================
  // URL入力処理
  // =====================================

  /**
   * FigmaファイルURLからファイルキーを抽出
   * 
   * サポートする形式:
   * - https://www.figma.com/file/{fileKey}/{fileName}
   * - https://www.figma.com/design/{fileKey}/{fileName}
   * - https://figma.com/file/{fileKey}/{fileName}
   */
  const extractFileKey = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (
        (pathParts[0] === 'file' || pathParts[0] === 'design') &&
        pathParts[1]
      ) {
        return pathParts[1];
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const handleUrlSubmit = () => {
    setUrlError(null);

    if (!figmaUrl.trim()) {
      setUrlError('FigmaファイルのURLを入力してください');
      return;
    }

    const fileKey = extractFileKey(figmaUrl);

    if (!fileKey) {
      setUrlError(
        '正しいFigmaファイルのURLを入力してください。\n' +
        '例: https://www.figma.com/file/ABC123/MyDesign'
      );
      return;
    }

    // ファイル選択を親コンポーネントに通知
    onSelect({
      key: fileKey,
      name: 'Figmaファイル',
      url: figmaUrl,
    });

    setUrlError(null);
  };

  // =====================================
  // 検索フィルター
  // =====================================

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // =====================================
  // レンダリング
  // =====================================

  return (
    <div className="space-y-4">
      {/* タブ切り替え */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setMode('list')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            mode === 'list'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📁 ファイル一覧から選択
        </button>
        <button
          onClick={() => setMode('url')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            mode === 'url'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔗 URL入力
        </button>
      </div>

      {/* =====================================
          モード1: ファイル一覧
          ===================================== */}
      {mode === 'list' && (
        <div className="space-y-4">
          {/* 説明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-xl mr-2">💡</span>
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">
                  Figmaファイル一覧から選択
                </p>
                <p className="text-blue-700 mb-2">
                  あなたがアクセス可能なFigmaファイルを表示します。
                </p>
                <p className="text-xs text-blue-600 bg-white px-2 py-1 rounded">
                  ⚠️ Figmaでチームに所属していない場合、ファイル一覧は表示されません。
                  <br />
                  その場合は「URL入力」タブから直接ファイルURLを指定してください。
                </p>
              </div>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-xl mr-2">⚠️</span>
                <div className="text-sm">
                  <p className="font-semibold text-yellow-900 mb-1">
                    ファイルが取得できません
                  </p>
                  <p className="text-yellow-700 whitespace-pre-line">{error}</p>
                  <button
                    onClick={() => setMode('url')}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    → URL入力に切り替える
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ローディング */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin mr-2">⏳</div>
              <p className="text-gray-600">ファイルを読み込み中...</p>
            </div>
          )}

          {/* ファイル一覧 */}
          {!isLoading && !error && files.length > 0 && (
            <div className="space-y-4">
              {/* 検索 */}
              <Input
                placeholder="ファイル名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* ファイルリスト */}
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {filteredFiles.map((file) => (
                  <div
                    key={file.key}
                    onClick={() => handleFileSelect(file)}
                    className={`
                      p-4 border-2 rounded-lg cursor-pointer transition-all
                      ${
                        selectedFileKey === file.key
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          最終更新: {new Date(file.last_modified).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      {selectedFileKey === file.key && (
                        <span className="text-blue-600 text-xl">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 検索結果なし */}
              {filteredFiles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>「{searchQuery}」に一致するファイルが見つかりませんでした</p>
                </div>
              )}
            </div>
          )}

          {/* 再取得ボタン */}
          {!isLoading && (
            <Button
              onClick={fetchFiles}
              variant="secondary"
              className="w-full"
            >
              🔄 ファイル一覧を再取得
            </Button>
          )}
        </div>
      )}

      {/* =====================================
          モード2: URL入力
          ===================================== */}
      {mode === 'url' && (
        <div className="space-y-4">
          {/* 説明 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-xl mr-2">💡</span>
              <div className="text-sm">
                <p className="font-semibold text-green-900 mb-1">
                  FigmaファイルのURLを直接入力
                </p>
                <p className="text-green-700 mb-2">
                  Figmaでファイルを開き、ブラウザのアドレスバーからURLをコピーして貼り付けてください。
                </p>
                <p className="text-xs text-green-600 bg-white px-2 py-1 rounded font-mono">
                  例: https://www.figma.com/file/ABC123/MyDesign
                </p>
                <p className="text-xs text-green-600 mt-2">
                  ✅ チーム未所属でも利用可能
                  <br />
                  ✅ 個人アカウントでも利用可能
                </p>
              </div>
            </div>
          </div>

          {/* URL入力フィールド */}
          <div>
            <Input
              label="FigmaファイルURL"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              placeholder="https://www.figma.com/file/..."
              error={urlError || undefined}
              required
            />
          </div>

          {/* 送信ボタン */}
          <Button onClick={handleUrlSubmit} className="w-full">
            ファイルを選択
          </Button>

          {/* URL取得方法 */}
          <details className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
              📖 FigmaファイルのURLを取得する方法
            </summary>
            <div className="mt-3 pl-4 border-l-2 border-gray-300 space-y-2">
              <p className="font-semibold text-gray-800">手順:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Figmaを開く（ブラウザまたはデスクトップアプリ）</li>
                <li>インポートしたいファイルを開く</li>
                <li>
                  ブラウザのアドレスバーからURLをコピー
                  <br />
                  <span className="text-xs text-gray-500 ml-4">
                    （デスクトップアプリの場合: ファイル名横の「...」→「リンクをコピー」）
                  </span>
                </li>
                <li>上の入力欄にURLを貼り付け</li>
                <li>「ファイルを選択」ボタンをクリック</li>
              </ol>
              <p className="text-xs text-gray-500 italic mt-2">
                ※ ファイルへのアクセス権限が必要です
              </p>
            </div>
          </details>
        </div>
      )}

      {/* 選択済みファイル表示 */}
      {selectedFileKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-xl mr-2">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-900">
                ファイルが選択されました
              </p>
              <p className="text-xs text-green-700 font-mono mt-1">
                File Key: {selectedFileKey}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}