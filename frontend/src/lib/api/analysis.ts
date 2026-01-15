// =====================================
// ファイルパス: frontend/src/lib/api/analysis.ts
// 概要: 診断結果API - ページング対応版
// 機能説明:
//   - 診断サマリー取得
//   - ルール違反一覧取得（ページング、フィルター）
//   - 崩壊予測一覧取得
//   - 改善提案一覧取得
// 作成日: 2026-01-12
// 更新日: 2026-01-16 - ページング機能追加、フィルター追加
// 依存関係:
//   - ./client
//   - @/types/models
// =====================================

import apiClient from './client';
import type { Violation, Prediction, Suggestion } from '@/types/models';

// =====================================
// 型定義
// =====================================

// API専用の型定義
export interface AnalysisResult {
  figleanScore: number;
  canGenerateHTML: boolean;
  canUseGrid: boolean;
  violations: {
    critical: number;
    major: number;
    minor: number;
  };
  totalFrames: number;
  analyzedAt: string;
}

// ルール違反型（API概要レスポンス用）
export interface AnalysisSummaryResponse {
  success: boolean;
  data: AnalysisResult | null;
}

// ルール違反型（API詳細レスポンス用）
export interface ViolationsParams {
  severity?: 'CRITICAL' | 'MAJOR' | 'MINOR';
  limit?: number;
  offset?: number;
  commentPosted?: 'true' | 'false';
}

// ルール違反型（レスポンス用）
export interface ViolationsResponse {
  success: boolean;
  data: {
    violations: Violation[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
export interface PredictionsResponse {
  success: boolean;
  data: {
    predictions: Prediction[];
  };
}

export interface SuggestionsResponse {
  success: boolean;
  data: {
    suggestions: Suggestion[];
  };
}

// =====================================
// API関数
// =====================================

/**
 * プロジェクトの診断サマリーを取得
 * 
 * @param projectId - プロジェクトID
 * @returns 診断サマリー
 */
export const getAnalysisSummary = async (
  projectId: string
): Promise<AnalysisSummaryResponse> => {
  const response = await apiClient.get(`/analysis/${projectId}`);
  return response.data;
};

/**
 * プロジェクトのルール違反一覧を取得（ページング対応）
 * 
 * @param projectId - プロジェクトID
 * @param params - 検索パラメータ
 * @returns ルール違反一覧
 */
export const getViolations = async (
  projectId: string,
  params?: ViolationsParams
): Promise<ViolationsResponse> => {
  const queryParams = new URLSearchParams();
  
  if (params?.severity) {
    queryParams.append('severity', params.severity);
  }
  if (params?.limit !== undefined) {
    queryParams.append('limit', String(params.limit));
  }
  if (params?.offset !== undefined) {
    queryParams.append('offset', String(params.offset));
  }
  if (params?.commentPosted !== undefined) {
    queryParams.append('commentPosted', params.commentPosted);
  }

  const url = `/analysis/${projectId}/violations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * プロジェクトの崩壊予測一覧を取得
 * 
 * @param projectId - プロジェクトID
 * @returns 崩壊予測一覧
 */
export const getPredictions = async (
  projectId: string
): Promise<PredictionsResponse> => {
  const response = await apiClient.get(`/analysis/${projectId}/predictions`);
  return response.data;
};

/**
 * プロジェクトの改善提案一覧を取得
 * 
 * @param projectId - プロジェクトID
 * @returns 改善提案一覧
 */
export const getSuggestions = async (
  projectId: string
): Promise<SuggestionsResponse> => {
  const response = await apiClient.get(`/analysis/${projectId}/suggestions`);
  return response.data;
};

// =====================================
// エクスポート
// =====================================

export default {
  getAnalysisSummary,
  getViolations,
  getPredictions,
  getSuggestions
};