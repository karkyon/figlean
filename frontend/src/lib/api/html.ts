/**
 * FIGLEAN Frontend - APIクライアント基盤
 * AxiosベースのHTTPクライアント設定
 * ファイルパス: frontend/src/lib/api/html.ts
 * 
 * 【修正内容】2026-01-14
 */

import apiClient from './client';
import type {
  GenerateHTMLRequest,
  GenerateHTMLResponse,
  HTMLHistoryResponse
} from '@/types/html';

/**
 * HTML生成API
 */

/**
 * HTML生成を実行
 */
export async function generateHTML(
  projectId: string,
  options: GenerateHTMLRequest
): Promise<GenerateHTMLResponse> {
  const response = await apiClient.post(
    `/html/generate/${projectId}`,
    options
  );
  return response.data.data;
}

/**
 * HTMLプレビューを取得
 */
export async function getHTMLPreview(projectId: string): Promise<string> {
  const response = await apiClient.get(`/html/${projectId}/preview`, {
    responseType: 'text'
  });
  return response.data;
}

/**
 * HTMLをダウンロード
 */
export async function downloadHTML(projectId: string): Promise<Blob> {
  const response = await apiClient.get(`/html/${projectId}/download`, {
    responseType: 'blob'
  });
  return response.data;
}

/**
 * HTML生成履歴を取得
 */
export async function getHTMLHistory(
  projectId: string,
  limit: number = 10,
  offset: number = 0
): Promise<HTMLHistoryResponse> {
  const response = await apiClient.get(`/html/${projectId}/history`, {
    params: { limit, offset }
  });
  return response.data.data;
}

/**
 * 生成されたHTMLを削除
 */
export async function deleteGeneratedHTML(generatedId: string): Promise<void> {
  await apiClient.delete(`/html/${generatedId}`);
}