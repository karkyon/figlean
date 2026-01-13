/**
 * FIGLEAN Frontend - Project API クライアント
 * ファイルパス: frontend/src/lib/api/projects.ts
 */

import apiClient from './client';
import type { ApiResponse } from '@/types/api'; // ApiListResponseは削除
import type { Project, ProjectDetail } from '@/types/models';

// =====================================
// カスタムレスポンス型（FIGLEAN専用）
// =====================================

/**
 * プロジェクト一覧レスポンス
 */
interface ProjectsListResponse {
  projects: Project[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// =====================================
// プロジェクト管理
// =====================================

/**
 * プロジェクト一覧取得
 */
export const getProjects = async (params?: {
  limit?: number;
  offset?: number;
  sort?: 'createdAt' | 'updatedAt' | 'figleanScore';
  order?: 'asc' | 'desc';
  status?: string;
  search?: string;
}): Promise<ProjectsListResponse> => {
  const response = await apiClient.get<ApiResponse<ProjectsListResponse>>(
    '/projects',
    { params }
  );
  return response.data.data;
};

/**
 * プロジェクト詳細取得
 * @param id - プロジェクトID
 */
export const getProjectById = async (id: string): Promise<ProjectDetail> => {
  const response = await apiClient.get<ApiResponse<ProjectDetail>>(
    `/projects/${id}`
  );
  return response.data.data;
};

/**
 * プロジェクト作成
 * @param data - プロジェクト作成データ
 */
export const createProject = async (data: {
  name: string;
  description?: string;
  figmaFileKey: string;
  figmaFileUrl: string;
  analyzeAll?: boolean;
}): Promise<ProjectDetail> => {
  const response = await apiClient.post<ApiResponse<ProjectDetail>>(
    '/projects',
    data
  );
  return response.data.data;
};

/**
 * プロジェクト更新
 * @param id - プロジェクトID
 * @param data - 更新データ
 */
export const updateProject = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
  }>
): Promise<ProjectDetail> => {
  const response = await apiClient.put<ApiResponse<ProjectDetail>>(
    `/projects/${id}`,
    data
  );
  return response.data.data;
};

/**
 * プロジェクト削除
 * @param id - プロジェクトID
 */
export const deleteProject = async (id: string): Promise<void> => {
  await apiClient.delete(`/projects/${id}`);
};