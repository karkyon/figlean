/**
 * FIGLEAN Frontend - HTML生成履歴タブ
 * ファイルパス: frontend/src/components/project/HTMLHistoryTab.tsx
 * 
 * 機能:
 * - 生成履歴一覧表示
 * - 履歴詳細モーダル
 * - 再生成機能
 * - 履歴削除機能
 * 
 * 作成日: 2026年1月14日
 */

'use client';

import { useState, useEffect } from 'react';
import type { Project } from '@/types/models';
import type { HTMLHistoryItem, HTMLHistoryResponse, Framework } from '@/types/html';
import { getHTMLHistory, deleteGeneratedHTML, generateHTML } from '@/lib/api/html';

interface HTMLHistoryTabProps {
  project: Project;
}

export default function HTMLHistoryTab({ project }: HTMLHistoryTabProps) {
  const [history, setHistory] = useState<HTMLHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<HTMLHistoryItem | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false
  });

  useEffect(() => {
    loadHistory();
  }, [project.id, pagination.offset]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: HTMLHistoryResponse = await getHTMLHistory(
        project.id,
        pagination.limit,
        pagination.offset
      );
      setHistory(response.history);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (item: HTMLHistoryItem) => {
    setRegenerating(true);
    try {
      await generateHTML(project.id, {
        framework: item.framework,
        includeResponsive: true,
        includeGrid: false,
      });
      await loadHistory();
      setSelectedItem(null);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '再生成に失敗しました');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この履歴を削除しますか？')) return;
    
    setDeletingId(id);
    try {
      await deleteGeneratedHTML(id);
      await loadHistory();
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit)
      }));
    }
  };

  const getFrameworkLabel = (framework: Framework): string => {
    switch (framework) {
      case 'HTML_TAILWIND':
        return 'HTML + Tailwind';
      case 'REACT_JSX':
        return 'React Component';
      case 'VUE_SFC':
        return 'Vue Component';
      default:
        return framework;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">完了</span>;
      case 'FAILED':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">失敗</span>;
      case 'GENERATING':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">生成中</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">{status}</span>;
    }
  };

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">履歴を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">生成履歴</h2>
        {pagination.total > 0 && (
          <p className="text-sm text-gray-600">
            全 {pagination.total} 件
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* 履歴一覧 */}
      {history.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-600 mb-2">📭 生成履歴はありません</p>
          <p className="text-sm text-gray-500">Generatorタブで新しいHTMLを生成してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{getFrameworkLabel(item.framework)}</h3>
                    {getStatusBadge(item.generationStatus)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-500">総行数:</span>
                      <span className="ml-2 font-medium">{item.metadata.totalLines}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tailwindクラス:</span>
                      <span className="ml-2 font-medium">{item.metadata.tailwindClasses}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">コンポーネント:</span>
                      <span className="ml-2 font-medium">{item.metadata.componentCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">再現率:</span>
                      <span className="ml-2 font-medium">
                        {(item.metadata.reproductionRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    生成時間: {item.generationTimeMs}ms | 
                    作成日時: {new Date(item.createdAt).toLocaleString('ja-JP')}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    詳細
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                  >
                    {deletingId === item.id ? '削除中...' : '削除'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ページネーション */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            onClick={handlePrevPage}
            disabled={pagination.offset === 0}
            className="px-4 py-2 bg-gray-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-600">
            {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} / {pagination.total}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!pagination.hasMore}
            className="px-4 py-2 bg-gray-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">履歴詳細</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本情報 */}
              <div>
                <h4 className="font-semibold mb-3">基本情報</h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-600">フレームワーク:</dt>
                    <dd className="font-medium">{getFrameworkLabel(selectedItem.framework)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">ステータス:</dt>
                    <dd>{getStatusBadge(selectedItem.generationStatus)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">生成時間:</dt>
                    <dd className="font-medium">{selectedItem.generationTimeMs}ms</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">作成日時:</dt>
                    <dd className="font-medium">
                      {new Date(selectedItem.createdAt).toLocaleString('ja-JP')}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* メタデータ */}
              <div>
                <h4 className="font-semibold mb-3">生成メタデータ</h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-600">総行数:</dt>
                    <dd className="font-medium">{selectedItem.metadata.totalLines}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Tailwindクラス数:</dt>
                    <dd className="font-medium">{selectedItem.metadata.tailwindClasses}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">コンポーネント数:</dt>
                    <dd className="font-medium">{selectedItem.metadata.componentCount}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">再現率:</dt>
                    <dd className="font-medium">
                      {(selectedItem.metadata.reproductionRate * 100).toFixed(1)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">コード品質スコア:</dt>
                    <dd className="font-medium">{selectedItem.metadata.codeQualityScore}</dd>
                  </div>
                </dl>
              </div>

              {/* アクション */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleRegenerate(selectedItem)}
                  disabled={regenerating}
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
                >
                  {regenerating ? '再生成中...' : '🔄 同じ設定で再生成'}
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}