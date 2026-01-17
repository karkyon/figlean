// =====================================
// ファイルパス: frontend/src/components/autofix/AutoFixPreviewModal.tsx
// 概要: AutoFix修正プレビューモーダル
// 機能説明: 一括修正前に修正内容をプレビュー表示
// 作成日: 2026-01-17
// 更新日: 2026-01-17 - 初回作成
// 依存関係: @/lib/api/autofix, @/components/ui/Button
// =====================================

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  generateAutoFixPreview,
  executeAutoFix,
} from '@/lib/api/autofix';
import type {
  AutoFixPreviewResponse,
  AutoFixExecuteResponse,
} from '@/types/autofix';
import { logger } from '@/lib/logger';

interface AutoFixPreviewModalProps {
  projectId: string;
  violationIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: AutoFixExecuteResponse) => void;
  onError: (error: string) => void;
  deleteComments?: boolean;
}

export function AutoFixPreviewModal({
  projectId,
  violationIds,
  isOpen,
  onClose,
  onSuccess,
  onError,
  deleteComments = false,
}: AutoFixPreviewModalProps) {
  const [preview, setPreview] = useState<AutoFixPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (isOpen && violationIds.length > 0) {
      loadPreview();
    }
  }, [isOpen, violationIds]);

  const loadPreview = async () => {
    setIsLoading(true);

    try {
      logger.info('[AutoFixPreviewModal] プレビュー生成開始', {
        projectId,
        violationCount: violationIds.length,
      });

      const result = await generateAutoFixPreview(projectId, {
        violationIds,
        deleteComments,
      });

      setPreview(result);
      logger.info('[AutoFixPreviewModal] プレビュー生成成功', { result });
    } catch (error: any) {
      logger.error('[AutoFixPreviewModal] プレビュー生成エラー', { error });
      onError(error.message || 'プレビュー生成に失敗しました');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!preview) return;

    setIsExecuting(true);

    try {
      logger.info('[AutoFixPreviewModal] 一括修正実行開始', {
        projectId,
        violationCount: violationIds.length,
      });

      const result = await executeAutoFix(projectId, {
        violationIds,
        deleteComments,
      });

      logger.info('[AutoFixPreviewModal] 一括修正実行成功', { result });
      onSuccess(result);
      onClose();
    } catch (error: any) {
      logger.error('[AutoFixPreviewModal] 一括修正実行エラー', { error });
      onError(error.message || '修正実行に失敗しました');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-4xl max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">🔧 AutoFix プレビュー</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">プレビューを生成中...</p>
          </div>
        ) : preview ? (
          <>
            {/* スコア影響表示 */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">現在のスコア</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {preview.scoreImpact.currentScore}
                  </p>
                </div>
                <div className="text-3xl text-gray-400">→</div>
                <div>
                  <p className="text-sm text-gray-600">予測スコア</p>
                  <p className="text-2xl font-bold text-green-600">
                    {preview.scoreImpact.estimatedScore}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">改善</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{preview.scoreImpact.improvement.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            {/* 修正項目リスト */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2">
                修正項目 ({preview.totalCount}件)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                推定実行時間: {preview.estimatedDuration}秒
              </p>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {preview.items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-blue-600">
                          {item.category}
                        </span>
                        <span className="mx-2 text-gray-400">›</span>
                        <span className="text-sm text-gray-600">
                          {item.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        ~{item.estimatedDuration}秒
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {item.nodeName}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={isExecuting}>
                キャンセル
              </Button>
              <Button
                variant="primary"
                onClick={handleExecute}
                disabled={isExecuting}
              >
                {isExecuting
                  ? '🔧 修正実行中...'
                  : `🔧 ${preview.totalCount}件を修正実行`}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}