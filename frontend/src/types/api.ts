/**
 * FIGLEAN Frontend - API型定義
 * APIリクエスト/レスポンスの型定義
 * 作成日時: 2026年1月12日
 */

import {
  User,
  Project,
  ProjectDetail,
  Analysis,
  Violation,
  Prediction,
  Suggestion,
  FigmaFile,
  FigmaFileDetail,
  FigmaImportRequest,
  ImportProgress,
  GenerateRequest,
  GenerateResponse,
  GeneratorHistory,
  Pagination,
  ProjectFilters,
} from './models';

// =====================================
// Common Response Types
// =====================================

/**
 * API共通レスポンス
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

/**
 * APIエラーレスポンス
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
}

/**
 * ページネーション付きレスポンス
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// =====================================
// Auth API Types
// =====================================

/**
 * ログインリクエスト
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * ログインレスポンス
 */
export interface LoginResponse {
  user: User;
  token: string;
}

/**
 * 登録リクエスト
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * 登録レスポンス
 */
export interface RegisterResponse {
  user: User;
  token: string;
}

/**
 * パスワード変更リクエスト
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Figmaトークン保存リクエスト
 */
export interface SaveFigmaTokenRequest {
  token: string;
}

/**
 * トークンリフレッシュレスポンス
 */
export interface RefreshTokenResponse {
  token: string;
}

// =====================================
// Project API Types
// =====================================

/**
 * プロジェクト作成リクエスト
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  figmaFileKey: string;
  figmaFileUrl?: string;
  figmaFileName?: string;
  figmaNodeId?: string;
}

/**
 * プロジェクト更新リクエスト
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

/**
 * プロジェクト一覧リクエスト
 */
export interface GetProjectsRequest {
  page?: number;
  limit?: number;
  filters?: ProjectFilters;
}

/**
 * プロジェクト一覧レスポンス
 */
export type GetProjectsResponse = PaginatedResponse<Project>;

/**
 * ブレークポイント更新リクエスト
 */
export interface UpdateBreakpointsRequest {
  breakpoints: Array<{
    name: string;
    minWidth: number;
    maxWidth: number | null;
  }>;
}

// =====================================
// Figma API Types
// =====================================

/**
 * Figmaファイル一覧取得リクエスト
 */
export interface GetFigmaFilesRequest {
  // トークンは認証ヘッダーから取得
}

/**
 * Figmaファイル一覧レスポンス
 */
export interface GetFigmaFilesResponse {
  files: FigmaFile[];
}

/**
 * Figmaファイル詳細取得リクエスト
 */
export interface GetFigmaFileDetailRequest {
  fileKey: string;
}

/**
 * Figmaファイル詳細レスポンス
 */
export type GetFigmaFileDetailResponse = FigmaFileDetail;

/**
 * Figmaインポート実行レスポンス
 */
export interface StartFigmaImportResponse {
  jobId: string;
  message: string;
}

// =====================================
// Analysis API Types
// =====================================

/**
 * 診断結果取得レスポンス
 */
export type GetAnalysisResponse = Analysis;

/**
 * 違反一覧取得レスポンス
 */
export interface GetViolationsResponse {
  violations: Violation[];
  statistics: {
    totalCount: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
}

/**
 * 崩れ予測取得レスポンス
 */
export interface GetPredictionsResponse {
  predictions: Prediction[];
}

/**
 * 改善提案取得レスポンス
 */
export interface GetSuggestionsResponse {
  suggestions: Suggestion[];
}

// =====================================
// Generator API Types (Phase 2)
// =====================================

/**
 * HTML生成レスポンス
 */
export type GenerateHtmlResponse = GenerateResponse;

/**
 * 生成履歴取得レスポンス
 */
export interface GetGeneratorHistoryResponse {
  history: GeneratorHistory[];
}

// =====================================
// Helper Types
// =====================================

/**
 * クエリパラメータ
 */
export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * HTTP Methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
