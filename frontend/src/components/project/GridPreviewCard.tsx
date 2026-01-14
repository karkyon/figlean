/**
 * FIGLEAN Frontend - Grid判定プレビューカード
 * ファイルパス: frontend/src/components/project/GridPreviewCard.tsx
 * 
 * 機能:
 * - Grid判定結果表示
 * - Grid候補ノード一覧
 * - スコア100%要件説明
 * 
 * 作成日: 2026年1月14日 - Phase 2.5
 */

'use client';

import { useState } from 'react';
import type { Project } from '@/types/models';

interface GridPreviewCardProps {
  project: Project;
}

export default function GridPreviewCard({ project }: GridPreviewCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const canUseGrid = project.figleanScore === 100;
  const score = project.figleanScore || 0;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>Grid Layout変換</span>
            {canUseGrid ? (
              <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
                利用可能
              </span>
            ) : (
              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                利用不可
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            FIGLEAN 100%限定機能
          </p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showDetails ? '詳細を隠す' : '詳細を表示'}
        </button>
      </div>

      {/* スコア表示 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">現在のスコア</span>
          <span className={`font-bold ${canUseGrid ? 'text-green-600' : 'text-orange-600'}`}>
            {score}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${
              canUseGrid ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Grid Layoutを利用するには100%が必要
        </p>
      </div>

      {/* ステータスメッセージ */}
      {canUseGrid ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <h4 className="font-semibold text-green-800 mb-1">
                Grid Layout利用可能
              </h4>
              <p className="text-sm text-green-700">
                スコア100%達成！より柔軟で保守性の高いGrid Layoutでの生成が可能です。
              </p>
              <ul className="mt-2 text-xs text-green-600 space-y-1">
                <li>• レスポンシブ対応の向上</li>
                <li>• コードの可読性向上</li>
                <li>• より柔軟なレイアウト表現</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-orange-800 mb-1">
                Grid Layout利用不可
              </h4>
              <p className="text-sm text-orange-700 mb-2">
                現在のスコア: {score}% （100%が必要）
              </p>
              <p className="text-sm text-orange-700">
                Grid Layoutを利用するには以下の条件を満たす必要があります:
              </p>
              <ul className="mt-2 text-xs text-orange-600 space-y-1">
                <li>• FIGLEAN適合度スコア = 100%</li>
                <li>• CRITICAL違反 = 0件</li>
                <li>• MAJOR違反 = 0件</li>
                <li>• Auto Layout完全適用</li>
                <li>• セマンティック命名完璧</li>
              </ul>
              <p className="text-xs text-orange-600 mt-3">
                → Violationsタブで違反を確認し、すべて修正してください
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 詳細情報 */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold text-sm mb-3">Grid vs Flexbox比較</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded p-3">
              <h5 className="font-medium text-gray-900 mb-2">Flexbox (デフォルト)</h5>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>✓ 一次元レイアウト</li>
                <li>✓ スコア90%以上で利用可能</li>
                <li>✓ シンプルな構造</li>
                <li>✓ 高い互換性</li>
              </ul>
            </div>
            <div className={`rounded p-3 ${canUseGrid ? 'bg-green-50' : 'bg-gray-50'}`}>
              <h5 className={`font-medium mb-2 ${canUseGrid ? 'text-green-900' : 'text-gray-900'}`}>
                Grid Layout {canUseGrid && '(利用可能)'}
              </h5>
              <ul className={`space-y-1 text-xs ${canUseGrid ? 'text-green-700' : 'text-gray-600'}`}>
                <li>✓ 二次元レイアウト</li>
                <li>✓ スコア100%限定</li>
                <li>✓ 高度な配置制御</li>
                <li>✓ レスポンシブ最適化</li>
              </ul>
            </div>
          </div>

          {!canUseGrid && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> スコアを100%にすることで、Figmaデザインの意図をより正確に反映したHTML生成が可能になります。
                Violationsタブで違反を確認し、一つずつ修正していきましょう。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}