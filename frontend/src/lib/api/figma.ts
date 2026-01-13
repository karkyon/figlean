/**
 * FIGLEAN Frontend - Figma API クライアント
 * ファイルパス: frontend/src/lib/api/figma.ts
 */

import apiClient from './client';
import type { ApiResponse } from '@/types/api';
import type {
  FigmaFilesResponse,
  FigmaFileDetail,
  FigmaUser,
  FigmaImportRequest,
  FigmaImportResponse,
  JobStatus,
} from '@/types/figma';

// =====================================
// Figmaユーザー情報
// =====================================

/**
 * Figmaユーザー情報取得
 */
export const getFigmaUser = async (): Promise<FigmaUser> => {
  const response = await apiClient.get<ApiResponse<FigmaUser>>('/figma/user');
  return response.data.data;
};

// =====================================
// Figmaファイル管理
// =====================================

/**
 * Figmaファイル一覧取得
 */
export const getFigmaFiles = async (): Promise<FigmaFilesResponse> => {
  const response = await apiClient.get<ApiResponse<FigmaFilesResponse>>('/figma/files');
  return response.data.data;
};

/**
 * Figmaファイル詳細取得
 * @param fileKey - FigmaファイルKey
 */
export const getFigmaFileDetail = async (fileKey: string): Promise<FigmaFileDetail> => {
  const response = await apiClient.get<ApiResponse<FigmaFileDetail>>(
    `/figma/file/${fileKey}`
  );
  return response.data.data;
};

/**
 * FigmaファイルのFrame一覧取得
 * @param fileKey - FigmaファイルKey
 */
export const getFigmaFrames = async (fileKey: string): Promise<any> => {
  const response = await apiClient.get<ApiResponse<any>>(
    `/figma/file/${fileKey}/frames`
  );
  return response.data.data;
};

// =====================================
// Figmaインポート
// =====================================

/**
 * Figmaインポート実行
 * @param data - インポートリクエストデータ
 */
export const importFigmaFile = async (
  data: FigmaImportRequest
): Promise<FigmaImportResponse> => {
  const response = await apiClient.post<ApiResponse<FigmaImportResponse>>(
    '/figma/import',
    data
  );
  return response.data.data;
};

/**
 * インポートジョブステータス取得
 * @param jobId - ジョブID
 */
export const getImportJobStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await apiClient.get<ApiResponse<JobStatus>>(
    `/figma/import/status/${jobId}`
  );
  return response.data.data;
};

/**
 * インポートジョブステータスをポーリング
 * @param jobId - ジョブID
 * @param onProgress - 進捗コールバック
 * @param interval - ポーリング間隔（ミリ秒、デフォルト: 2000）
 * @returns 完了したジョブステータス
 */
export const pollImportJobStatus = async (
  jobId: string,
  onProgress?: (status: JobStatus) => void,
  interval: number = 2000
): Promise<JobStatus> => {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getImportJobStatus(jobId);

        // 進捗コールバック呼び出し
        if (onProgress) {
          onProgress(status);
        }

        // 完了またはエラーで終了
        if (status.status === 'COMPLETED') {
          resolve(status);
          return;
        } else if (status.status === 'FAILED') {
          reject(new Error(status.error || 'インポートに失敗しました'));
          return;
        }

        // 次のポーリングをスケジュール
        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };

    // ポーリング開始
    poll();
  });
};