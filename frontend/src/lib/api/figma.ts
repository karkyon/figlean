/**
 * ファイルパス: frontend/src/lib/api/figma.ts
 * 概要: Figma API クライアント
 * 機能説明: FIGLEAN フロントエンドからバックエンド経由で Figma API を操作するための API ラッパー群
 * 作成日: 2026-01-12
 * 更新日: 2026-01-15
 * 更新理由: importFigmaFile関数のリクエストボディ修正 - fileKeyパラメータ不足エラー修正
 * 依存関係: ./client, @/types/api, @/types/figma
 * 
 * FIGLEAN Frontend - Figma API クライアント
 * --------------------------------------------------
 * このファイルは FIGLEAN フロントエンドから
 * バックエンド経由で Figma API を操作するための
 * API ラッパー群を定義する。
 *
 * - 直接 Figma API を叩かない理由：
 *   ・トークン秘匿
 *   ・FIGLEAN独自解析ロジックの介在
 *   ・将来のAPI差し替え耐性
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

// ==================================================
// Figma ユーザー情報
// ==================================================

/**
 * Figmaに紐づくユーザー情報を取得
 *
 * 主用途：
 * - 接続確認
 * - ユーザー名表示
 * - ワークスペース判定
 */
export const getFigmaUser = async (): Promise<FigmaUser> => {
  const response = await apiClient.get<ApiResponse<FigmaUser>>('/figma/user');
  return response.data.data;
};

// ==================================================
// Figma ファイル管理
// ==================================================

/**
 * Figmaファイル一覧を取得
 *
 * - ユーザーがアクセス可能なファイル群
 * - FIGLEANプロジェクト作成時の選択肢になる
 */
export const getFigmaFiles = async (): Promise<FigmaFilesResponse> => {
  const response = await apiClient.get<ApiResponse<FigmaFilesResponse>>(
    '/figma/files'
  );
  return response.data.data;
};

/**
 * Figmaファイル詳細取得
 *
 * - ページ構造
 * - documentツリー
 * - FIGLEAN解析の起点データ
 *
 * @param fileKey Figmaファイルキー
 */
export const getFigmaFileDetails = async (
  fileKey: string
): Promise<FigmaFileDetail> => {
  const response = await apiClient.get<ApiResponse<FigmaFileDetail>>(
    `/figma/file/${fileKey}`
  );
  return response.data.data;
};

/**
 * Figmaファイル内の Frame 一覧を取得
 *
 * - UI生成単位
 * - スコア算出対象
 *
 * @param fileKey Figmaファイルキー
 */
export const getFigmaFrames = async (fileKey: string): Promise<any> => {
  const response = await apiClient.get<ApiResponse<any>>(
    `/figma/file/${fileKey}/frames`
  );
  return response.data.data;
};

// ==================================================
// Figma インポート（FIGLEAN解析ジョブ）
// ==================================================

/**
 * FigmaファイルをFIGLEANにインポートし、
 * 非同期解析ジョブを開始する
 *
 * - ノード解析
 * - 命名評価
 * - レイヤ構造評価
 * 
 * 修正: バックエンドが期待するfileKeyパラメータを送信するように変更
 */
export const importFigmaFile = async (
  data: FigmaImportRequest
): Promise<FigmaImportResponse> => {
  // バックエンドが期待する形式に変換
  const requestBody = {
    fileKey: data.figmaFileKey,  // バックエンドはfileKeyを期待
    projectId: data.projectId,
    importType: data.analyzeAll ? 'all' : 'specific',
    nodeIds: data.selectedPages || [],
  };
  
  const response = await apiClient.post<ApiResponse<FigmaImportResponse>>(
    '/figma/import',
    requestBody
  );
  return response.data.data;
};

/**
 * インポートジョブの現在ステータスを取得
 *
 * @param jobId ジョブID
 */
export const getImportJobStatus = async (
  jobId: string
): Promise<JobStatus> => {
  const response = await apiClient.get<ApiResponse<JobStatus>>(
    `/figma/import/status/${jobId}`
  );
  return response.data.data;
};

/**
 * インポートジョブを一定間隔でポーリングする
 *
 * - COMPLETED で resolve
 * - FAILED で reject
 * - 途中経過は onProgress で通知
 *
 * UI側では：
 * - プログレスバー
 * - ステータス表示
 * に利用される
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

        onProgress?.(status);

        if (status.status === 'COMPLETED') {
          resolve(status);
          return;
        }

        if (status.status === 'FAILED') {
          reject(new Error(status.error || 'インポートに失敗しました'));
          return;
        }

        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
};

// ==================================================
// Phase4 : プレビュー / コメント（運用支援）
// ==================================================

/**
 * Figmaプレビュー画像取得リクエスト
 *
 * - UI確認
 * - レビュー用途
 */
export interface FigmaPreviewRequest {
  fileKey: string;
  nodeId?: string;
  scale?: number;
  format?: 'jpg' | 'png' | 'svg';
}

export interface FigmaPreviewResponse {
  success: boolean;
  data: {
    imageUrl: string;
    fileKey: string;
    nodeId?: string;
  };
}

/**
 * Figmaのプレビュー画像を生成・取得
 *
 * ※ バックエンド側で Figma Images API を代理実行
 */
export const getFigmaPreview = async (
  request: FigmaPreviewRequest
): Promise<FigmaPreviewResponse> => {
  const params = new URLSearchParams({
    fileKey: request.fileKey,
    scale: String(request.scale ?? 1),
    format: request.format ?? 'png',
  });

  if (request.nodeId) {
    params.append('nodeId', request.nodeId);
  }

  const response = await apiClient.get(
    `/figma/preview?${params.toString()}`
  );
  return response.data;
};

// --------------------------------------------------

/**
 * Figmaコメント投稿リクエスト
 *
 * - FIGLEAN解析結果の指摘
 * - チーム共有用
 */
export interface PostFigmaCommentRequest {
  projectId: string;
  fileKey: string;
  nodeId?: string;
  message: string;
}

export interface PostFigmaCommentResponse {
  success: boolean;
  data: {
    commentId: string;
    postedAt: string;
  };
  message: string;
}

/**
 * Figmaファイルにコメントを投稿
 */
export const postFigmaComment = async (
  request: PostFigmaCommentRequest
): Promise<PostFigmaCommentResponse> => {
  const response = await apiClient.post('/figma/comments', request);
  return response.data;
};

// ==================================================
// Figma ファイル基本情報
// ==================================================

export interface FigmaFileInfo {
  name: string;
  lastModified: string;
  thumbnailUrl: string | null;
  version: string;
}

export interface GetFigmaFileInfoResponse {
  success: boolean;
  data: FigmaFileInfo;
}

/**
 * Figmaファイルのメタ情報を取得
 *
 * - 一覧表示
 * - 更新検知
 */
export const getFigmaFileInfo = async (
  fileKey: string
): Promise<GetFigmaFileInfoResponse> => {
  const response = await apiClient.get(
    `/figma/files/${fileKey}/info`
  );
  return response.data;
};