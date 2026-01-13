// =====================================
// backend/src/types/project.ts
// プロジェクト型定義 - FIGLEAN版
// 作成日時: 2026年1月11日 00:10
// 更新日時: 2026年1月11日 00:10 - Prismaスキーマ完全準拠版
// 依存関係: @prisma/client
// 説明: プロジェクト管理機能の型定義、実際のDBスキーマに完全準拠
// =====================================

/**
 * Project Types
 * プロジェクト管理機能の型定義
 */

import { AnalysisStatus, UserRole } from '@prisma/client';

/**
 * プロジェクト作成DTO
 */
export interface CreateProjectDto {
  name: string;
  description?: string;
  figmaFileKey: string;
  figmaFileUrl?: string;
  figmaFileName?: string;
  figmaNodeId?: string;
}

/**
 * プロジェクト更新DTO
 */
export interface UpdateProjectDto {
  name?: string;
  description?: string;
  figmaFileUrl?: string;
  figmaFileName?: string;
  figmaNodeId?: string;
}

/**
 * プロジェクト一覧クエリパラメータ
 */
export interface ProjectListQuery {
  limit?: number;
  offset?: number;
  sort?: 'createdAt' | 'updatedAt' | 'figleanScore' | 'name';
  order?: 'asc' | 'desc';
  status?: AnalysisStatus;
  search?: string;
}

/**
 * プロジェクト統計情報
 */
export interface ProjectStats {
  totalFrames: number;
  totalViolations: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
}

/**
 * プロジェクト一覧アイテム
 */
export interface ProjectListItem {
  id: string;
  name: string;
  figmaFileUrl: string | null;
  figleanScore: number | null;
  analysisStatus: AnalysisStatus;
  lastAnalyzedAt: Date | null;
  stats: ProjectStats | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * プロジェクト一覧レスポンス
 */
export interface ProjectListResponse {
  projects: ProjectListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * プロジェクト詳細
 */
export interface ProjectDetail {
  id: string;
  name: string;
  userId: string;
  description: string | null;
  figmaFileKey: string;
  figmaFileUrl: string | null;
  figmaFileName: string | null;
  figmaNodeId: string | null;
  figleanScore: number | null;
  layoutScore: number | null;
  componentScore: number | null;
  responsiveScore: number | null;
  semanticScore: number | null;
  analysisStatus: AnalysisStatus;
  lastAnalyzedAt: Date | null;
  analysisCount: number;
  htmlGeneratable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * プラン制限情報
 */
export interface PlanLimits {
  maxProjects: number;
  currentCount: number;
}

/**
 * Prisma型のエクスポート
 */
export type { AnalysisStatus, UserRole };