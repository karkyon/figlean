// =====================================
// ファイルパス: frontend/src/lib/api/autofix.ts
// 概要: AutoFix API Client
// 機能説明: Backend AutoFix APIとの通信処理
// 作成日: 2026-01-17
// 更新日: 2026-01-17 - 初回作成
// 依存関係: @/lib/api/client, @/types/autofix
// =====================================

import apiClient from './client';
import type {
  AutoFixConfig,
  UpdateAutoFixConfigRequest,
  AutoFixPreviewRequest,
  AutoFixPreviewResponse,
  AutoFixExecuteRequest,
  AutoFixExecuteResponse,
  AutoFixHistory,
  GetHistoriesRequest,
  GetHistoriesResponse,
  RollbackRequest,
  RollbackResponse,
} from '@/types/autofix';

// =====================================
// Config API
// =====================================

/**
 * AutoFix設定取得
 */
export const getAutoFixConfig = async (): Promise<AutoFixConfig> => {
  const response = await apiClient.get('/autofix/config');
  return response.data.data;
};

/**
 * AutoFix設定更新
 */
export const updateAutoFixConfig = async (
  config: UpdateAutoFixConfigRequest
): Promise<AutoFixConfig> => {
  const response = await apiClient.put('/autofix/config', config);
  return response.data.data;
};

/**
 * AutoFix設定リセット
 */
export const resetAutoFixConfig = async (): Promise<AutoFixConfig> => {
  const response = await apiClient.post('/autofix/config/reset');
  return response.data.data;
};

// =====================================
// Preview & Execute API
// =====================================

/**
 * 修正プレビュー生成
 */
export const generateAutoFixPreview = async (
  projectId: string,
  request: AutoFixPreviewRequest
): Promise<AutoFixPreviewResponse> => {
  const response = await apiClient.post(
    `/autofix/${projectId}/preview`,
    request
  );
  return response.data.data;
};

/**
 * 一括修正実行
 */
export const executeAutoFix = async (
  projectId: string,
  request: AutoFixExecuteRequest
): Promise<AutoFixExecuteResponse> => {
  const response = await apiClient.post(
    `/autofix/${projectId}/execute`,
    request
  );
  return response.data.data;
};

/**
 * 個別修正実行
 */
export const executeIndividualAutoFix = async (
  projectId: string,
  violationId: string,
  deleteComments?: boolean
): Promise<AutoFixExecuteResponse> => {
  const response = await apiClient.post(
    `/autofix/${projectId}/execute/individual`,
    {
      violationId,
      deleteComment: deleteComments, // Backendは単数形deleteCommentを期待
    }
  );
  return response.data.data;
};

// =====================================
// History API
// =====================================

/**
 * 履歴一覧取得
 */
export const getAutoFixHistories = async (
  projectId: string,
  params?: GetHistoriesRequest
): Promise<GetHistoriesResponse> => {
  const queryParams = new URLSearchParams();
  
  if (params?.limit !== undefined) {
    queryParams.append('limit', String(params.limit));
  }
  if (params?.offset !== undefined) {
    queryParams.append('offset', String(params.offset));
  }
  if (params?.status) {
    queryParams.append('status', params.status);
  }

  const url = `/autofix/${projectId}/history${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  const response = await apiClient.get(url);
  return response.data.data;
};

/**
 * 履歴詳細取得
 */
export const getAutoFixHistoryDetail = async (
  historyId: string
): Promise<AutoFixHistory> => {
  const response = await apiClient.get(`/autofix/history/${historyId}`);
  return response.data.data;
};

// =====================================
// Rollback API
// =====================================

/**
 * Rollback実行
 */
export const rollbackAutoFix = async (
  request: RollbackRequest
): Promise<RollbackResponse> => {
  const response = await apiClient.post('/autofix/rollback', request);
  return response.data.data;
};