/**
 * FIGLEAN Frontend - スケルトンローディングコンポーネント
 * ファイルパス: frontend/src/components/common/SkeletonLoader.tsx
 * 
 * 機能:
 * - 各種スケルトンローダー
 * - プロジェクトカード用
 * - 診断結果用
 * - タブコンテンツ用
 * 
 * 作成日: 2026年1月14日 - Phase 2.6
 */

'use client';

import React from 'react';

/**
 * 基本スケルトン
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

/**
 * プロジェクトカードスケルトン
 */
export const ProjectCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border p-6 shadow-sm">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
    <div className="mt-4 pt-4 border-t">
      <Skeleton className="h-2 w-full" />
    </div>
  </div>
);

/**
 * スコアカードスケルトン
 */
export const ScoreCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border p-6 shadow-sm">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="text-center">
          <Skeleton className="h-4 w-20 mx-auto mb-2" />
          <Skeleton className="h-10 w-16 mx-auto mb-1" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * 診断結果カードスケルトン
 */
export const AnalysisCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border p-6 shadow-sm">
    <div className="flex items-start gap-4 mb-4">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
    <div className="flex items-center gap-3 pt-4 border-t">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-24" />
    </div>
  </div>
);

/**
 * タブコンテンツスケルトン
 */
export const TabContentSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-24" />
    </div>
    <AnalysisCardSkeleton />
    <AnalysisCardSkeleton />
    <AnalysisCardSkeleton />
  </div>
);

/**
 * グリッドスケルトン
 */
export const GridSkeleton: React.FC<{ count?: number; columns?: number }> = ({ 
  count = 6, 
  columns = 3 
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-6`}>
    {[...Array(count)].map((_, i) => (
      <ProjectCardSkeleton key={i} />
    ))}
  </div>
);

/**
 * テーブルスケルトン
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-white rounded-lg border overflow-hidden">
    <div className="border-b bg-gray-50 p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
    <div className="divide-y">
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {[...Array(columns)].map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * ページ全体ローディング
 */
export const PageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 py-8">
    <div className="mb-8">
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>

    <ScoreCardSkeleton />

    <div className="mt-6 mb-6">
      <Skeleton className="h-12 w-full" />
    </div>

    <TabContentSkeleton />
  </div>
);

export default {
  Skeleton,
  ProjectCardSkeleton,
  ScoreCardSkeleton,
  AnalysisCardSkeleton,
  TabContentSkeleton,
  GridSkeleton,
  TableSkeleton,
  PageSkeleton
};