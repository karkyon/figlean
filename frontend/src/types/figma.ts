/**
 * FIGLEAN Frontend - Figma関連型定義
 * ファイルパス: frontend/src/types/figma.ts
 */

// =====================================
// Figmaファイル関連
// =====================================

/**
 * Figmaファイル情報
 */
export interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url: string | null;
  last_modified: string;
}

/**
 * Figmaファイル一覧レスポンス
 */
export interface FigmaFilesResponse {
  files: FigmaFile[];
}

/**
 * Figmaファイル詳細
 */
export interface FigmaFileDetail {
  name: string;
  lastModified: string;
  thumbnailUrl: string | null;
  version: string;
  document: FigmaNode;
  schemaVersion: number;
}

/**
 * Figmaノード
 */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  visible?: boolean;
  locked?: boolean;
}

/**
 * Figmaユーザー情報
 */
export interface FigmaUser {
  id: string;
  email: string;
  handle: string;
  img_url: string | null;
}

/**
 * FigmaページのFrame情報
 */
export interface FigmaFrame {
  id: string;
  name: string;
  type: string;
  parent: string;
}

/**
 * Figmaインポートリクエスト
 */
export interface FigmaImportRequest {
  projectId: string;
  fileKey: string;
  pageIds?: string[];
  analyzeAll: boolean;
}

/**
 * Figmaインポートレスポンス
 */
export interface FigmaImportResponse {
  jobId: string;
  status: 'IMPORTING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  message: string;
}

/**
 * ジョブステータス
 */
export interface JobStatus {
  jobId: string;
  status: 'IMPORTING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  progress: {
    current: number;
    total: number;
    percentage: number;
    currentStep: string;
  };
  error?: string;
  completedAt?: string;
}

// =====================================
// プロジェクト作成関連
// =====================================

/**
 * プロジェクト作成データ（ステップ1）
 */
export interface CreateProjectStep1Data {
  name: string;
  description?: string;
  importSource: 'figma' | 'image';
}

/**
 * Figmaファイル選択データ（ステップ2）
 */
export interface CreateProjectStep2Data {
  figmaFileKey: string;
  figmaFileUrl: string;
  selectedPages?: string[];
  selectedFrames?: string[];
}

/**
 * プロジェクト作成完全データ
 */
export interface CreateProjectFullData extends CreateProjectStep1Data, CreateProjectStep2Data {
  analyzeAll: boolean;
}