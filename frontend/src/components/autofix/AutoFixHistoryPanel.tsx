// =====================================
// ファイルパス: frontend/src/components/autofix/AutoFixHistoryPanel.tsx
// 概要: AutoFix修正履歴パネル
// 機能説明: 修正履歴の一覧表示とRollback機能
// 作成日: 2026-01-17
// 更新日: 2026-01-17 - 初回作成
// 依存関係: @/lib/api/autofix, @/components/ui/Button, @/types/autofix
// =====================================

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  getAutoFixHistories,
  rollbackAutoFix,
} from '@/lib/api/autofix';
import type {
  AutoFixHistory,
  AutoFixStatus,
} from '@/types/autofix';
import { logger } from '@/lib/logger';

interface AutoFixHistoryPanelProps {
  projectId: string;
  onRollbackSuccess?: () => void;
}

export function AutoFixHistoryPanel({
  projectId,
  onRollbackSuccess,
}: AutoFixHistoryPanelProps) {
  const [histories, setHistories] = useState<AutoFixHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadHistories();
  }, [offset]);

  const loadHistories = async () => {
    setIsLoading(true);

    try {
      const result = await getAutoFixHistories(projectId, {
        limit,
        offset,
      });

      setHistories(result.histories);
      setHasMore(result.hasMore);

      logger.info('[AutoFixHistoryPanel] 履歴取得成功', {
        count: result.histories.length,
        total: result.total,
      });
    } catch (error: any) {
      logger.error('[AutoFixHistoryPanel] 履歴取得エラー', { error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async (historyId: string) => {
    const confirmed = window.confirm(
      '修正を元に戻しますか?\nこの操作は取り消せません。'
    );

    if (!confirmed) return;

    setIsRollingBack(historyId);

    try {
      logger.info('[AutoFixHistoryPanel] Rollback実行開始', { historyId });

      await rollbackAutoFix({ historyIds: [historyId] });

      logger.info('[AutoFixHistoryPanel] Rollback実行成功');
      loadHistories();
      onRollbackSuccess?.();
    } catch (error: any) {
      logger.error('[AutoFixHistoryPanel] Rollback実行エラー', { error });
      alert('Rollbackに失敗しました');
    } finally {
      setIsRollingBack(null);
    }
  };

  const getStatusBadge = (status: AutoFixStatus) => {
    const badges: Record<AutoFixStatus, { label: string; color: string }> = {
      PENDING: { label: '待機中', color: 'bg-gray-100 text-gray-700' },
      EXECUTING: { label: '実行中', color: 'bg-blue-100 text-blue-700' },
      COMPLETED: { label: '完了', color: 'bg-green-100 text-green-700' },
      FAILED: { label: '失敗', color: 'bg-red-100 text-red-700' },
      ROLLED_BACK: { label: 'ロールバック済', color: 'bg-yellow-100 text-yellow-700' },
    };

    const badge = badges[status];

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">🔧 AutoFix 修正履歴</h3>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      ) : histories.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">修正履歴がありません</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {histories.map((history) => (
              <div
                key={history.id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(history.status)}
                    <span className="text-sm text-gray-600">
                      {history.isIndividual ? '個別修正' : '一括修正'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(history.executedAt).toLocaleString('ja-JP')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">修正件数</p>
                    <p className="text-lg font-bold text-blue-600">
                      {history.fixedCount}件
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">スコア変化</p>
                    <p className="text-lg font-bold text-green-600">
                      {history.beforeScore} → {history.afterScore}
                      <span className="text-sm ml-1">
                        (+{history.scoreDelta.toFixed(1)})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">コメント削除</p>
                    <p className="text-sm font-medium">
                      {history.deleteComments ? 'あり' : 'なし'}
                    </p>
                  </div>
                </div>

                {history.status === 'COMPLETED' && !history.rolledBackAt && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRollback(history.id)}
                      disabled={isRollingBack === history.id}
                    >
                      {isRollingBack === history.id
                        ? 'ロールバック中...'
                        : '↩ ロールバック'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ページネーション */}
          {(offset > 0 || hasMore) && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0 || isLoading}
              >
                ← 前へ
              </Button>
              <span className="text-sm text-gray-600">
                {offset + 1} - {offset + histories.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + limit)}
                disabled={!hasMore || isLoading}
              >
                次へ →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}