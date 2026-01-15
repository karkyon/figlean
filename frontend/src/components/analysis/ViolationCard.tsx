/**
 * FIGLEAN Frontend - ルール違反カードコンポーネント（修正版）
 * ファイルパス: frontend/src/components/analysis/ViolationCard.tsx
 * 
 * 機能:
 * - ルール違反の詳細を視覚的に表示
 * - 重要度別の色分け（CRITICAL/MAJOR/MINOR）
 * - 影響範囲と改善提案の表示
 * - Figmaコメント投稿機能
 * 
 * 作成日: 2026年1月14日
 * 更新日: 2026年1月15日 - Figmaコメント投稿ボタン追加
 * 依存関係: @/types/models, @/lib/api/figma
 */

'use client';

import React, { useState } from 'react';
import { Violation, ViolationSeverity } from '@/types/models';
import * as figmaApi from '@/lib/api/figma';

// =====================================
// 型定義
// =====================================

interface ViolationCardProps {
  violation: Violation;
  projectId: string;
  onCommentPosted?: () => void;
}

// =====================================
// ヘルパー関数
// =====================================

const getSeverityColor = (severity: ViolationSeverity): string => {
  switch (severity) {
    case ViolationSeverity.CRITICAL:
      return 'bg-red-50 border-red-200';
    case ViolationSeverity.MAJOR:
      return 'bg-yellow-50 border-yellow-200';
    case ViolationSeverity.MINOR:
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getSeverityBadgeColor = (severity: ViolationSeverity): string => {
  switch (severity) {
    case ViolationSeverity.CRITICAL:
      return 'bg-red-100 text-red-800';
    case ViolationSeverity.MAJOR:
      return 'bg-yellow-100 text-yellow-800';
    case ViolationSeverity.MINOR:
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getSeverityLabel = (severity: ViolationSeverity): string => {
  switch (severity) {
    case ViolationSeverity.CRITICAL:
      return '重大';
    case ViolationSeverity.MAJOR:
      return '警告';
    case ViolationSeverity.MINOR:
      return '軽微';
    default:
      return String(severity);
  }
};

const getSeverityIcon = (severity: ViolationSeverity): string => {
  switch (severity) {
    case ViolationSeverity.CRITICAL:
      return '🔴';
    case ViolationSeverity.MAJOR:
      return '🟡';
    case ViolationSeverity.MINOR:
      return '🔵';
    default:
      return '⚪';
  }
};

// =====================================
// メインコンポーネント
// =====================================

export const ViolationCard: React.FC<ViolationCardProps> = ({ 
  violation,
  projectId,
  onCommentPosted
}) => {
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentPosted, setCommentPosted] = useState(violation.commentPosted || false);

  // Figmaコメント投稿
  const handlePostComment = async () => {
    try {
      setIsPostingComment(true);

      // コメントメッセージ生成
      const message = generateCommentMessage(violation);

      // Figmaコメント投稿API呼び出し
      await figmaApi.postFigmaComment(projectId, violation.id);

      setCommentPosted(true);
      
      if (onCommentPosted) {
        onCommentPosted();
      }
    } catch (error: any) {
      console.error('Figmaコメント投稿エラー:', error);
      alert('コメントの投稿に失敗しました');
    } finally {
      setIsPostingComment(false);
    }
  };

  // コメントメッセージ生成
  const generateCommentMessage = (v: Violation): string => {
    const emoji = getSeverityIcon(v.severity);
    const priority = getSeverityLabel(v.severity);
    
    let message = `${emoji} **[${priority}]** ${v.ruleName}\n\n`;
    message += `**問題**: ${v.description}\n\n`;
    
    if (v.impact) {
      message += `**影響範囲**: ${v.impact}\n\n`;
    }
    
    if (v.suggestion) {
      message += `**改善提案**: ${v.suggestion}\n\n`;
    }
    
    message += `---\n`;
    message += `🔍 **FIGLEAN診断**\n`;
    message += `ルールID: \`${v.ruleId}\``;
    
    return message;
  };

  return (
    <div
      className={`border rounded-lg p-4 ${getSeverityColor(violation.severity)} hover:shadow-md transition-shadow`}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getSeverityIcon(violation.severity)}</span>
            <h3 className="font-semibold text-gray-900">{violation.ruleName}</h3>
          </div>
          <p className="text-sm text-gray-600">
            フレーム: <span className="font-medium">{violation.frameName}</span>
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${getSeverityBadgeColor(
              violation.severity
            )}`}
          >
            {getSeverityLabel(violation.severity)}
          </span>
          
          {commentPosted && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              ✓ Figmaコメント投稿済み
            </span>
          )}
        </div>
      </div>

      {/* 説明 */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 leading-relaxed">{violation.description}</p>
      </div>

      {/* カテゴリー */}
      <div className="mb-3">
        <span className="inline-block px-2 py-1 text-xs bg-white border border-gray-300 rounded text-gray-700">
          📂 {violation.ruleCategory}
        </span>
      </div>

      {/* 影響範囲 */}
      {violation.impact && (
        <div className="mb-3 p-3 bg-white rounded border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-1">💥 影響範囲:</p>
          <p className="text-sm text-gray-600">{violation.impact}</p>
        </div>
      )}

      {/* 改善提案 */}
      {violation.suggestion && (
        <div className="mb-3 p-3 bg-white rounded border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-1">💡 改善提案:</p>
          <p className="text-sm text-gray-600">{violation.suggestion}</p>
        </div>
      )}

      {/* Figmaコメント投稿ボタン */}
      {!commentPosted && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <button
            onClick={handlePostComment}
            disabled={isPostingComment}
            className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
          >
            {isPostingComment ? (
              <>
                <span className="animate-spin">⏳</span>
                投稿中...
              </>
            ) : (
              <>
                💬 Figmaにコメント投稿
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ViolationCard;