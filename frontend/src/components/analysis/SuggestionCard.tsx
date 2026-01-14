/**
 * FIGLEAN Frontend - 改善提案カードコンポーネント（修正版）
 * ファイルパス: frontend/src/components/analysis/SuggestionCard.tsx
 * 
 * 機能:
 * - 改善提案の詳細を視覚的に表示
 * - 優先度別の色分け（数値ベース）
 * - 期待される効果と実装手順の表示
 * 
 * 更新日: 2026年1月14日 - Backendスキーマに完全一致
 */

import React, { useState } from 'react';
import { Suggestion } from '@/types/models';

// =====================================
// 型定義
// =====================================

interface SuggestionCardProps {
  suggestion: Suggestion;
}

// =====================================
// ヘルパー関数
// =====================================

/**
 * 優先度（数値）から色を取得
 * 1=最高優先度（赤）、数値が大きいほど低優先度
 */
const getPriorityColor = (priority: number): string => {
  if (priority <= 3) return 'bg-red-50 border-red-200';
  if (priority <= 6) return 'bg-yellow-50 border-yellow-200';
  return 'bg-green-50 border-green-200';
};

const getPriorityBadgeColor = (priority: number): string => {
  if (priority <= 3) return 'bg-red-100 text-red-800';
  if (priority <= 6) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

const getPriorityLabel = (priority: number): string => {
  if (priority <= 3) return '高';
  if (priority <= 6) return '中';
  return '低';
};

const getPriorityIcon = (priority: number): string => {
  if (priority <= 3) return '🔥';
  if (priority <= 6) return '⚡';
  return '💡';
};

/**
 * impactLevelから色を取得
 */
const getImpactIcon = (impactLevel: string): string => {
  switch (impactLevel?.toUpperCase()) {
    case 'HIGH':
      return '🔥';
    case 'MEDIUM':
      return '⚡';
    case 'LOW':
      return '💡';
    default:
      return '📊';
  }
};

const getImpactLabel = (impactLevel: string): string => {
  switch (impactLevel?.toUpperCase()) {
    case 'HIGH':
      return '高';
    case 'MEDIUM':
      return '中';
    case 'LOW':
      return '低';
    default:
      return impactLevel || '不明';
  }
};

/**
 * 作業時間のラベル
 */
const getDifficultyIcon = (difficulty: string | null): string => {
  if (!difficulty) return '⏱️';
  
  switch (difficulty.toUpperCase()) {
    case 'EASY':
      return '✅';
    case 'MEDIUM':
      return '⚙️';
    case 'HARD':
      return '🔧';
    default:
      return '⏱️';
  }
};

// =====================================
// メインコンポーネント
// =====================================

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg p-4 ${getPriorityColor(
        suggestion.priority
      )} hover:shadow-md transition-shadow`}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getPriorityIcon(suggestion.priority)}</span>
            <h3 className="font-semibold text-gray-900">{suggestion.title}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              🎯 対象: {suggestion.targetFrame}
            </span>
          </div>
        </div>

        {/* 優先度バッジ */}
        <div className="flex flex-col items-end gap-1">
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityBadgeColor(
              suggestion.priority
            )}`}
          >
            優先度: {getPriorityLabel(suggestion.priority)}
          </span>
          <span className="text-xs text-gray-500">
            順位: #{suggestion.priority}
          </span>
        </div>
      </div>

      {/* 説明 */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 leading-relaxed">{suggestion.description}</p>
      </div>

      {/* 改善効果 */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {/* 影響度 */}
        <div className="p-2 bg-white rounded border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">
            {getImpactIcon(suggestion.impactLevel)} 影響度
          </p>
          <p className="text-sm font-medium text-gray-900">
            {getImpactLabel(suggestion.impactLevel)}
          </p>
        </div>

        {/* スコア改善見込み */}
        <div className="p-2 bg-white rounded border border-gray-200">
          <p className="text-xs text-gray-600 mb-1">📈 スコア改善</p>
          <p className="text-sm font-medium text-gray-900">
            +{suggestion.scoreImprovement}点
          </p>
        </div>
      </div>

      {/* 作業情報 */}
      {(suggestion.estimatedTime || suggestion.difficulty) && (
        <div className="mb-3 flex items-center gap-3 text-xs text-gray-600">
          {suggestion.estimatedTime && (
            <span className="flex items-center gap-1">
              ⏱️ {suggestion.estimatedTime}
            </span>
          )}
          {suggestion.difficulty && (
            <span className="flex items-center gap-1">
              {getDifficultyIcon(suggestion.difficulty)} 難易度: {suggestion.difficulty}
            </span>
          )}
        </div>
      )}

      {/* 実装手順（展開可能） */}
      {suggestion.actionSteps && Array.isArray(suggestion.actionSteps) && suggestion.actionSteps.length > 0 && (
        <div className="bg-white rounded border border-gray-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs font-medium text-gray-700">
              🔧 実装手順 ({suggestion.actionSteps.length}ステップ) {isExpanded ? '▼' : '▶'}
            </span>
          </button>

          {isExpanded && (
            <div className="p-3 pt-0">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                {suggestion.actionSteps.map((step: any, index: number) => (
                  <li key={index}>
                    {typeof step === 'string' ? step : step.description || JSON.stringify(step)}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ビフォー・アフター */}
      {(suggestion.beforeValue || suggestion.afterValue) && (
        <div className="mt-3 p-3 bg-white rounded border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">🔄 変更内容:</p>
          {suggestion.beforeValue && (
            <div className="mb-2">
              <p className="text-xs text-red-600 mb-1">❌ Before:</p>
              <p className="text-sm text-gray-600">{suggestion.beforeValue}</p>
            </div>
          )}
          {suggestion.afterValue && (
            <div>
              <p className="text-xs text-green-600 mb-1">✅ After:</p>
              <p className="text-sm text-gray-600">{suggestion.afterValue}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuggestionCard;