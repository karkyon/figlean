/**
 * FIGLEAN Frontend - ルール違反カードコンポーネント
 * ファイルパス: frontend/src/components/analysis/ViolationCard.tsx
 * 
 * 機能:
 * - ルール違反の詳細表示
 * - 影響範囲・改善提案の表示
 * - Figmaコメント投稿機能
 * - Figmaコメント確認リンク（投稿済みの場合）
 * 
 * 作成日: 2026年1月13日
 * 更新日: 2026年1月16日 - Figmaコメント確認ボタン追加
 * 依存関係: @/types/models, @/lib/api/client
 */

'use client';

import { useState } from 'react';
import { Violation, Project } from '@/types/models';
import apiClient from '@/lib/api/client';
import { logger } from '@/lib/logger';

interface ViolationCardProps {
  violation: Violation;
  projectId: string;
  project: Project;
  onCommentPosted?: () => void;
}

export function ViolationCard({ violation, projectId, project, onCommentPosted }: ViolationCardProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePostComment = async () => {
    try {
      setIsPosting(true);
      logger.info('Figmaコメント投稿開始', { violationId: violation.id });

      const response = await apiClient.post(`/figma/comments/${projectId}/${violation.id}`, {
        includeFixSteps: true,
        includeDetectedValue: true,
        language: 'ja'
      });

      // ★★★ 修正箇所：レスポンスのsuccessをチェック ★★★
      if (!response.data.success) {
        const errorMessage = response.data.error?.message || 'コメント投稿に失敗しました';
        alert(errorMessage);
        logger.error('Figmaコメント投稿失敗', null, { 
          violationId: violation.id,
          error: response.data.error 
        });
        return;
      }

      alert('Figmaにコメントを投稿しました');
      logger.success('Figmaコメント投稿成功', { violationId: violation.id });

      if (onCommentPosted) {
        onCommentPosted();
      }
    } catch (error: any) {
      console.error('Figmaコメント投稿エラー:', error);
      const errorMessage = error.response?.data?.error?.message || 'コメント投稿に失敗しました';
      alert(errorMessage);
      logger.error('Figmaコメント投稿失敗', error, { violationId: violation.id });
    } finally {
      setIsPosting(false);
    }
  };

  const severityColor = {
    CRITICAL: 'border-red-300 bg-red-50',
    MAJOR: 'border-yellow-300 bg-yellow-50',
    MINOR: 'border-blue-300 bg-blue-50'
  }[violation.severity];

  const severityLabel = {
    CRITICAL: '🔴 重大',
    MAJOR: '🟡 警告',
    MINOR: '🔵 軽微'
  }[violation.severity];

  return (
    <div className={`border-l-4 rounded-lg p-4 ${severityColor}`}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold">{severityLabel}</span>
            <span className="text-xs px-2 py-0.5 bg-white rounded border">
              {violation.category}
            </span>
            {violation.commentPosted && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded border border-green-300">
                ✓ Figmaコメント投稿済み
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900">{violation.ruleName}</h3>
          <p className="text-sm text-gray-700 mt-1">{violation.description}</p>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2 ml-4 flex-shrink-0">
          {/* Figmaコメント確認ボタン（投稿済みの場合のみ） */}
          {violation.commentPosted && (
            <a
              href={`https://www.figma.com/file/${violation.figmaFileKey || project?.figmaFileKey}?node-id=${violation.figmaNodeId || violation.frameId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 whitespace-nowrap"
              title="Figmaでコメントを確認"
            >
              <span>👁</span>
              <span>Figmaで確認</span>
            </a>
          )}

          {/* Figmaコメント投稿ボタン（未投稿の場合のみ） */}
          {!violation.commentPosted && (
            <button
              onClick={handlePostComment}
              disabled={isPosting}
              className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isPosting ? '投稿中...' : '💬 Figmaに投稿'}
            </button>
          )}

          {/* 詳細展開ボタン */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            {isExpanded ? '▲ 閉じる' : '▼ 詳細'}
          </button>
        </div>
      </div>

      {/* 展開コンテンツ */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {/* フレーム情報 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">📍 対象フレーム</h4>
            <p className="text-sm text-gray-600">{violation.frameName}</p>
            {violation.figmaNodeId && (
              <a
                href={`https://www.figma.com/file/${violation.figmaFileKey}?node-id=${violation.figmaNodeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1"
              >
                🔗 Figmaで開く
              </a>
            )}
          </div>

          {/* 検出値 */}
          {violation.detectedValue && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">🔍 検出値</h4>
              <p className="text-sm text-gray-600">{violation.detectedValue}</p>
            </div>
          )}

          {/* 影響範囲 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">⚠️ 影響範囲</h4>
            <p className="text-sm text-gray-600">{violation.impact}</p>
          </div>

          {/* 改善提案 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">💡 改善提案</h4>
            <p className="text-sm text-gray-600">{violation.suggestion}</p>
          </div>

          {/* 修正手順 */}
          {violation.fixSteps && violation.fixSteps.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">🔧 修正手順</h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                {violation.fixSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}