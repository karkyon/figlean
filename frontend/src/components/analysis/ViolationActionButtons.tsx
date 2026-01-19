/**
 * FIGLEAN Frontend - 違反アクションボタンコンポーネント
 * ファイルパス: frontend/src/components/analysis/ViolationActionButtons.tsx
 * 
 * 機能:
 * - Figmaコメント投稿
 * - Figmaコメント削除（🆕 追加）
 * - Figmaでの確認リンク
 * 
 * 更新日: 2026年1月19日 - コメント削除機能追加
 */

'use client';

import { useState } from 'react'; // 🆕 追加
import { Violation, Project } from '@/types/models';
import apiClient from '@/lib/api/client';

interface ViolationActionButtonsProps {
  violation: Violation;
  projectId: string;
  project: Project;
  onSuccess?: () => Promise<void>;
  onError: (error: string) => void;
}

export function ViolationActionButtons({ 
  violation, 
  projectId, 
  project,
  onSuccess, 
  onError 
}: ViolationActionButtonsProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePostComment = async () => {
    if (violation.commentPosted) {
      onError('このルール違反は既にFigmaに投稿済みです');
      return;
    }

    try {
      setIsPosting(true);

      await apiClient.post(`/figma/comments/${projectId}/${violation.id}`, {
        includeFixSteps: true,
        includeDetectedValue: true,
        language: 'ja'
      });

      if (onSuccess) {
        await onSuccess();
      }
    } catch (error: any) {
      console.error('コメント投稿エラー:', error);
      const errorMessage = error.response?.data?.error?.message || 'コメント投稿に失敗しました';
      onError(errorMessage);
    } finally {
      setIsPosting(false);
    }
  };

  // コメント削除ハンドラー追加
  const handleDeleteComment = async () => {
    if (!violation.commentPosted) {
      onError('コメントが投稿されていません');
      return;
    }

    const confirmed = confirm(
      `Figmaコメントを削除しますか?\n\n違反: ${violation.ruleName}\nフレーム: ${violation.frameName}`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);

      await apiClient.delete(`/figma/comments/${projectId}/${violation.id}`);

      if (onSuccess) {
        await onSuccess();
      }
    } catch (error: any) {
      console.error('コメント削除エラー:', error);
      const errorMessage = error.response?.data?.error?.message || 'コメント削除に失敗しました';
      onError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {violation.commentPosted && (
        <>
          <a
            href={`https://www.figma.com/file/${project.figmaFileKey}?node-id=${violation.figmaNodeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
          >
            ✓ Figmaで確認
          </a>
          
          {/* コメント削除ボタン追加 */}
          <button
            onClick={handleDeleteComment}
            disabled={isDeleting}
            className="px-3 py-1.5 text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? '削除中...' : '🗑️ コメント削除'}
          </button>
        </>
      )}

      {!violation.commentPosted && (
        <button
          onClick={handlePostComment}
          disabled={isPosting}
          className="px-3 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 disabled:opacity-50 transition-colors"
        >
          {isPosting ? '投稿中...' : '💬 Figmaへ投稿'}
        </button>
      )}
    </>
  );
}