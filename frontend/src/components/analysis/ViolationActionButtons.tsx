// =====================================
// ファイルパス: frontend/src/components/analysis/ViolationActionButtons.tsx
// 概要: Violation用アクションボタン群
// 機能説明: AutoFixボタンとFigmaコメントボタンをスタイリッシュに配置
// 作成日: 2026-01-17
// 更新日: 2026-01-17 - Figma確認ボタンをaタグに修正（元の動作するコードに戻す）
// 依存関係: @/components/ui/Button, @/lib/api/*
// =====================================

'use client';

import { useState } from 'react';
import { executeIndividualAutoFix } from '@/lib/api/autofix';
import apiClient from '@/lib/api/client';
import { logger } from '@/lib/logger';
import type { Violation, Project } from '@/types/models';

interface ViolationActionButtonsProps {
  violation: Violation;
  projectId: string;
  project: Project;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function ViolationActionButtons({
  violation,
  projectId,
  project,
  onSuccess,
  onError,
}: ViolationActionButtonsProps) {
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  // AutoFix個別実行
  const handleAutoFix = async () => {
    setIsAutoFixing(true);

    try {
      logger.info('[ViolationActionButtons] AutoFix実行開始', {
        projectId,
        violationId: violation.id,
      });

      const result = await executeIndividualAutoFix(projectId, violation.id, false);

      logger.info('[ViolationActionButtons] AutoFix実行成功', { result });

      if (result.successCount > 0) {
        onSuccess?.();
      } else {
        onError?.('修正に失敗しました');
      }
    } catch (error: any) {
      logger.error('[ViolationActionButtons] AutoFix実行エラー', { error });
      onError?.(error.message || '修正に失敗しました');
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Figmaコメント投稿
  const handlePostComment = async () => {
    setIsPostingComment(true);

    try {
      logger.info('[ViolationActionButtons] コメント投稿開始', {
        projectId,
        violationId: violation.id,
      });

      await apiClient.post(`/figma/comments/${projectId}/${violation.id}`, {
        includeFixSteps: true,
        includeDetectedValue: true,
        language: 'ja',
      });

      logger.info('[ViolationActionButtons] コメント投稿成功');
      onSuccess?.();
    } catch (error: any) {
      logger.error('[ViolationActionButtons] コメント投稿エラー', { error });
      onError?.('コメント投稿に失敗しました');
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* AutoFixボタン */}
      <button
        onClick={handleAutoFix}
        disabled={isAutoFixing}
        className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
      >
        {isAutoFixing ? (
          <>
            <span className="animate-spin">⚙️</span>
            <span>修正中...</span>
          </>
        ) : (
          <>
            <span>🔧</span>
            <span>AutoFix</span>
          </>
        )}
      </button>

      {/* Figmaコメント投稿/確認ボタン */}
      {violation.commentPosted ? (
        <a
          href={`https://www.figma.com/file/${violation.figmaFileKey || project.figmaFileKey}?node-id=${violation.figmaNodeId || violation.frameId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors flex items-center gap-1.5"
        >
          <span>✓</span>
          <span>Figmaで確認</span>
        </a>
      ) : (
        <button
          onClick={handlePostComment}
          disabled={isPostingComment}
          className="px-3 py-1.5 text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {isPostingComment ? (
            <>
              <span className="animate-spin">⚙️</span>
              <span>投稿中...</span>
            </>
          ) : (
            <>
              <span>💬</span>
              <span>Figmaコメント</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}