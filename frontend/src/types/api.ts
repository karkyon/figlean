/**
 * FIGLEAN Frontend - API型定義（修正版）
 * APIリクエスト/レスポンスの型定義
 * 更新日時: 2026年1月14日 - 重複削除、正しいインポート
 */

import {
  User,
  Project,
  ProjectDetail,
  Analysis,
  Violation,
  Prediction,
  Suggestion,
  GenerateRequest,
  GenerateResponse,
  GeneratorHistory,
  Pagination,
  ProjectFilters,
} from './models';

import {
  FigmaFile,
  FigmaFileDetail,
  FigmaImportRequest,
  ImportProgress,
} from './figma';

// =====================================
// Common Response Types
// =====================================

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// =====================================
// Auth API Types
// =====================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SaveFigmaTokenRequest {
  token: string;
}

export interface RefreshTokenResponse {
  token: string;
}

// =====================================
// Project API Types
// =====================================

export interface CreateProjectRequest {
  name: string;
  description?: string;
  figmaFileKey: string;
  figmaFileUrl?: string;
  figmaFileName?: string;
  figmaNodeId?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface GetProjectsRequest {
  page?: number;
  limit?: number;
  filters?: ProjectFilters;
}

export type GetProjectsResponse = PaginatedResponse<Project>;

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

export interface GetFigmaFilesRequest {
  // トークンは認証ヘッダーから取得
}

export interface GetFigmaFilesResponse {
  files: FigmaFile[];
}

export interface GetFigmaFileDetailRequest {
  fileKey: string;
}

export type GetFigmaFileDetailResponse = FigmaFileDetail;

export interface StartFigmaImportResponse {
  jobId: string;
  message: string;
}

// =====================================
// Analysis API Types
// =====================================

export type GetAnalysisResponse = Analysis;

export interface GetViolationsResponse {
  violations: Violation[];
  statistics: {
    totalCount: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
}

export interface GetPredictionsResponse {
  predictions: Prediction[];
}

export interface GetSuggestionsResponse {
  suggestions: Suggestion[];
}

// =====================================
// Generator API Types
// =====================================

export type GenerateHtmlResponse = GenerateResponse;

export interface GetGeneratorHistoryResponse {
  history: GeneratorHistory[];
}

// =====================================
// Helper Types
// =====================================

export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';