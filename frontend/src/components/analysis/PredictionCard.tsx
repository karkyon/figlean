/**
 * FIGLEAN Frontend - 崩壊予測カードコンポーネント（修正版）
 * ファイルパス: frontend/src/components/analysis/PredictionCard.tsx
 * 
 * 機能:
 * - 崩壊予測の詳細を視覚的に表示
 * - ブレークポイント別のリスク表示
 * - 修正提案の表示
 * 
 * 更新日: 2026年1月14日 - Backendスキーマに完全一致
 */

import React from 'react';
import { Prediction, ViolationSeverity } from '@/types/models';

// =====================================
// 型定義
// =====================================

interface PredictionCardProps {
  prediction: Prediction;
}

// =====================================
// ヘルパー関数
// =====================================

const getBreakTypeColor = (breakType: string): string => {
  switch (breakType) {
    case 'HORIZONTAL_SCROLL':
      return 'bg-purple-50 border-purple-200';
    case 'FLEX_WRAP_FAILURE':
      return 'bg-orange-50 border-orange-200';
    case 'TEXT_OVERFLOW':
      return 'bg-pink-50 border-pink-200';
    case 'SIZE_MISMATCH':
    case 'SIZE_INCONSISTENCY':
      return 'bg-indigo-50 border-indigo-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getBreakTypeIcon = (breakType: string): string => {
  switch (breakType) {
    case 'HORIZONTAL_SCROLL':
      return '↔️';
    case 'FLEX_WRAP_FAILURE':
      return '📦';
    case 'TEXT_OVERFLOW':
      return '📝';
    case 'SIZE_MISMATCH':
    case 'SIZE_INCONSISTENCY':
      return '⚡';
    default:
      return '⚠️';
  }
};

const getBreakTypeLabel = (breakType: string): string => {
  switch (breakType) {
    case 'HORIZONTAL_SCROLL':
      return '横スクロール発生';
    case 'FLEX_WRAP_FAILURE':
      return 'Flex折り返し失敗';
    case 'TEXT_OVERFLOW':
      return 'テキストオーバーフロー';
    case 'SIZE_MISMATCH':
    case 'SIZE_INCONSISTENCY':
      return 'サイズ不整合';
    default:
      return breakType;
  }
};

const getSeverityColor = (severity: ViolationSeverity): string => {
  switch (severity) {
    case ViolationSeverity.CRITICAL:
      return 'text-red-600 bg-red-100';
    case ViolationSeverity.MAJOR:
      return 'text-orange-600 bg-orange-100';
    case ViolationSeverity.MINOR:
      return 'text-blue-600 bg-blue-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getSeverityLabel = (severity: ViolationSeverity): string => {
  switch (severity) {
    case ViolationSeverity.CRITICAL:
      return '高';
    case ViolationSeverity.MAJOR:
      return '中';
    case ViolationSeverity.MINOR:
      return '低';
    default:
      return String(severity);
  }
};

const getSeverityIcon = (severity: ViolationSeverity): string => {
  switch (severity) {
    case ViolationSeverity.CRITICAL:
      return '🔥';
    case ViolationSeverity.MAJOR:
      return '⚠️';
    case ViolationSeverity.MINOR:
      return 'ℹ️';
    default:
      return '❓';
  }
};

const getBreakpointLabel = (breakpoint: string | null): string => {
  if (!breakpoint) return '全デバイス';
  
  switch (breakpoint.toLowerCase()) {
    case 'mobile':
      return 'モバイル';
    case 'tablet':
      return 'タブレット';
    case 'desktop':
      return 'デスクトップ';
    default:
      return breakpoint;
  }
};

// =====================================
// メインコンポーネント
// =====================================

export const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  return (
    <div
      className={`border rounded-lg p-4 ${getBreakTypeColor(
        prediction.breakType
      )} hover:shadow-md transition-shadow`}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getBreakTypeIcon(prediction.breakType)}</span>
            <h3 className="font-semibold text-gray-900">
              {prediction.breakTitle || getBreakTypeLabel(prediction.breakType)}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            フレーム: <span className="font-medium">{prediction.affectedFrame}</span>
          </p>
        </div>

        {/* 重要度バッジ */}
        <div className="flex flex-col items-end gap-2">
          <div
            className={`px-3 py-1 rounded-full ${getSeverityColor(prediction.severity)}`}
          >
            <span className="text-xs font-bold">{getSeverityIcon(prediction.severity)}</span>
          </div>
          <span className="text-xs text-gray-500">
            リスク: {getSeverityLabel(prediction.severity)}
          </span>
        </div>
      </div>

      {/* 説明 */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 leading-relaxed">{prediction.breakDescription}</p>
      </div>

      {/* ブレークポイント情報 */}
      <div className="mb-3 flex items-center gap-4 text-sm">
        {prediction.breakpoint && (
          <div className="flex items-center gap-1">
            <span>📱</span>
            <span className="text-gray-700">
              対象: <span className="font-medium">{getBreakpointLabel(prediction.breakpoint)}</span>
            </span>
          </div>
        )}
        {prediction.screenWidth && (
          <div className="flex items-center gap-1">
            <span>📏</span>
            <span className="text-gray-700">
              画面幅: <span className="font-medium">{prediction.screenWidth}px</span>
            </span>
          </div>
        )}
      </div>

      {/* 修正提案 */}
      <div className="p-3 bg-white rounded border border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-1">🔧 修正提案:</p>
        <p className="text-sm text-gray-600">{prediction.fixSuggestion}</p>
      </div>
    </div>
  );
};

export default PredictionCard;