/**
 * FIGLEAN Frontend - 診断API
 * 診断結果取得関連のAPI関数
 */

import apiClient from './client';
import type {
  ApiResponse,
  GetAnalysisResponse,
  GetViolationsResponse,
  GetPredictionsResponse,
  GetSuggestionsResponse,
} from '@/types/api';

// =====================================
// 診断API
// =====================================

/**
 * 診断サマリー取得
 */
export const getAnalysis = async (
  projectId: string
): Promise<GetAnalysisResponse> => {
  const response = await apiClient.get<ApiResponse<GetAnalysisResponse>>(
    `/analysis/${projectId}`
  );
  return response.data.data;
};

/**
 * ルール違反一覧取得
 */
export const getViolations = async (
  projectId: string
): Promise<GetViolationsResponse> => {
  const response = await apiClient.get<ApiResponse<GetViolationsResponse>>(
    `/analysis/${projectId}/violations`
  );
  return response.data.data;
};

/**
 * 崩れ予測取得
 */
export const getPredictions = async (
  projectId: string
): Promise<GetPredictionsResponse> => {
  const response = await apiClient.get<ApiResponse<GetPredictionsResponse>>(
    `/analysis/${projectId}/predictions`
  );
  return response.data.data;
};

/**
 * 改善提案取得
 */
export const getSuggestions = async (
  projectId: string
): Promise<GetSuggestionsResponse> => {
  const response = await apiClient.get<ApiResponse<GetSuggestionsResponse>>(
    `/analysis/${projectId}/suggestions`
  );
  return response.data.data;
};
