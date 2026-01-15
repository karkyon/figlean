/**
 * FIGLEAN Frontend - Figmaコメント投稿ボタン
 * ファイルパス: frontend/src/components/figma/FigmaCommentButton.tsx
 * 
 * 機能:
 * - ルール違反をFigmaにコメントとして投稿
 * - 投稿状態の管理とフィードバック
 * - 一括投稿機能
 * 
 * 作成日: 2026年1月15日
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import * as figmaApi from '@/lib/api/figma';

// =====================================
// 型定義
// =====================================

interface FigmaCommentButtonProps {
  projectId: string;
  violationId?: string;
  fileKey: string;
  nodeId?: string;
  message: string;
  onSuccess?: () => void;
  variant?: 'primary' | 'secondary' | 'icon';
  disabled?: boolean;
}

// =====================================
// メインコンポーネント
// =====================================

export function FigmaCommentButton({
  projectId,
  violationId,
  fileKey,
  nodeId,
  message,
  onSuccess,
  variant = 'secondary',
  disabled = false,
}: FigmaCommentButtonProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // =====================================
  // コメント投稿処理
  // =====================================

  const handlePostComment = async () => {
    if (!fileKey || !message) {
      setErrorMessage('ファイルキーまたはメッセージが指定されていません');
      setPostStatus('error');
      return;
    }

    setIsPosting(true);
    setPostStatus('idle');
    setErrorMessage(null);

    try {
      await figmaApi.postFigmaComment({
        projectId,
        fileKey,
        nodeId,
        message,
      });

      setPostStatus('success');
      
      if (onSuccess) {
        onSuccess();
      }

      // 2秒後に状態をリセット
      setTimeout(() => {
        setPostStatus('idle');
      }, 2000);
    } catch (error: any) {
      console.error('Figmaコメント投稿エラー:', error);
      setErrorMessage(error.message || 'コメントの投稿に失敗しました');
      setPostStatus('error');
    } finally {
      setIsPosting(false);
    }
  };

  // =====================================
  // レンダリング
  // =====================================

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={handlePostComment}
          disabled={disabled || isPosting}
          className={`p-2 rounded-lg transition-all ${
            postStatus === 'success'
              ? 'bg-green-100 text-green-700'
              : postStatus === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${disabled || isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Figmaにコメント投稿"
        >
          {isPosting ? (
            <span className="text-sm">⏳</span>
          ) : postStatus === 'success' ? (
            <span className="text-sm">✅</span>
          ) : postStatus === 'error' ? (
            <span className="text-sm">❌</span>
          ) : (
            <span className="text-sm">💬</span>
          )}
        </button>

        {/* エラーツールチップ */}
        {postStatus === 'error' && errorMessage && (
          <div className="absolute top-full mt-2 right-0 bg-red-50 border border-red-200 rounded-lg p-2 shadow-lg z-10 w-48">
            <p className="text-xs text-red-800">{errorMessage}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handlePostComment}
        disabled={disabled || isPosting}
        variant={variant}
        size="sm"
        className={
          postStatus === 'success'
            ? 'bg-green-600 hover:bg-green-700'
            : postStatus === 'error'
            ? 'bg-red-600 hover:bg-red-700'
            : ''
        }
      >
        {isPosting ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            投稿中...
          </>
        ) : postStatus === 'success' ? (
          <>
            <span className="mr-2">✅</span>
            投稿完了
          </>
        ) : postStatus === 'error' ? (
          <>
            <span className="mr-2">❌</span>
            投稿失敗
          </>
        ) : (
          <>
            <span className="mr-2">💬</span>
            Figmaにコメント投稿
          </>
        )}
      </Button>

      {/* エラーメッセージ */}
      {postStatus === 'error' && errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <p className="text-xs text-red-800">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}

// =====================================
// 一括投稿コンポーネント
// =====================================

interface BulkFigmaCommentButtonProps {
  projectId: string;
  violations: Array<{
    id: string;
    fileKey: string;
    nodeId?: string;
    message: string;
  }>;
  onSuccess?: () => void;
}

export function BulkFigmaCommentButton({
  projectId,
  violations,
  onSuccess,
}: BulkFigmaCommentButtonProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'posting' | 'success' | 'error'>('idle');
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);

  const handleBulkPost = async () => {
    if (violations.length === 0) {
      return;
    }

    setIsPosting(true);
    setStatus('posting');
    setProgress(0);
    setSuccessCount(0);
    setFailureCount(0);

    let success = 0;
    let failure = 0;

    for (let i = 0; i < violations.length; i++) {
      const violation = violations[i];

      try {
        await figmaApi.postFigmaComment({
          projectId,
          fileKey: violation.fileKey,
          nodeId: violation.nodeId,
          message: violation.message,
        });
        success++;
      } catch (error) {
        console.error(`コメント投稿失敗 (${violation.id}):`, error);
        failure++;
      }

      setProgress(Math.round(((i + 1) / violations.length) * 100));
      setSuccessCount(success);
      setFailureCount(failure);
    }

    setIsPosting(false);
    setStatus(failure === 0 ? 'success' : 'error');

    if (onSuccess && failure === 0) {
      onSuccess();
    }

    // 5秒後に状態をリセット
    setTimeout(() => {
      setStatus('idle');
      setProgress(0);
    }, 5000);
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleBulkPost}
        disabled={isPosting || violations.length === 0}
        variant="primary"
        size="md"
        className={
          status === 'success'
            ? 'bg-green-600 hover:bg-green-700'
            : status === 'error'
            ? 'bg-yellow-600 hover:bg-yellow-700'
            : ''
        }
      >
        {isPosting ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            一括投稿中... ({progress}%)
          </>
        ) : status === 'success' ? (
          <>
            <span className="mr-2">✅</span>
            すべて投稿完了
          </>
        ) : status === 'error' ? (
          <>
            <span className="mr-2">⚠️</span>
            投稿完了（一部失敗）
          </>
        ) : (
          <>
            <span className="mr-2">💬</span>
            すべてFigmaに投稿 ({violations.length}件)
          </>
        )}
      </Button>

      {/* プログレスバー */}
      {isPosting && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* 結果サマリー */}
      {(status === 'success' || status === 'error') && (
        <div
          className={`rounded-lg p-3 ${
            status === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}
        >
          <div className="flex items-center justify-between text-sm">
            <span
              className={
                status === 'success' ? 'text-green-800' : 'text-yellow-800'
              }
            >
              {status === 'success' ? '✅ すべて投稿完了' : '⚠️ 投稿完了'}
            </span>
            <div className="text-xs">
              <span className="text-green-700 font-semibold">
                成功: {successCount}
              </span>
              {failureCount > 0 && (
                <>
                  <span className="mx-1">|</span>
                  <span className="text-red-700 font-semibold">
                    失敗: {failureCount}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}