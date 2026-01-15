/**
 * FIGLEAN Frontend - Figma API専用型定義（修正版）
 * ファイルパス: frontend/src/types/figma.ts
 * Figma REST API v1のレスポンス形式に完全一致
 * 
 * 作成日: 2026年1月12日
 * 更新日時: 2026年1月15日
 * 更新理由: FigmaImportRequestにprojectIdフィールド追加 - Backend API仕様に合わせる
 * 依存関係: なし
 */

// =====================================
// Figma API Response Types
// =====================================

/**
 * Figma APIから返されるファイル情報（スネークケース）
 * Backendのfigma ApiServiceが返す実際の形式
 */
export interface FigmaFileRaw {
  key: string;
  name: string;
  thumbnail_url: string | null;
  last_modified: string;
}

/**
 * Figma APIファイル一覧レスポンス
 */
export interface FigmaFilesResponse {
  files: FigmaFileRaw[];
}

/**
 * Figma APIから返されるファイル詳細（実際のAPI形式）
 */
export interface FigmaFileDetailRaw {
  name: string;
  lastModified: string;
  thumbnailUrl: string | null;
  version: string;
  document: FigmaNode;
  components?: Record<string, any>;
  componentSets?: Record<string, any>;
  schemaVersion: number;
}

/**
 * Figmaノード（実際のAPI形式）
 */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  visible?: boolean;
  locked?: boolean;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  constraints?: {
    horizontal: string;
    vertical: string;
  };
}

/**
 * Figmaユーザー情報（実際のAPI形式）
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

// =====================================
// Frontend用変換済み型（キャメルケース）
// =====================================

/**
 * Frontend表示用のFigmaファイル情報
 * FigmaFileRaw → FigmaFile に変換して使用
 */
export interface FigmaFile {
  key: string;
  name: string;
  thumbnailUrl: string | null;
  lastModified: string;
}

/**
 * Frontend表示用のFigmaファイル詳細
 */
export interface FigmaFileDetail {
  key: string;
  name: string;
  pages: FigmaPage[];
}

/**
 * Figmaページ情報
 */
export interface FigmaPage {
  id: string;
  name: string;
  frameCount: number;
}

// =====================================
// Import/Job Types
// =====================================

/**
 * Figmaインポートリクエスト（Backend API用）
 */
export interface FigmaImportRequest {
  projectId: string;
  figmaFileKey: string;
  figmaFileUrl?: string;
  analyzeAll?: boolean;
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
 * インポート進捗情報
 */
export interface ImportProgress {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  message: string | null;
  errorMessage: string | null;
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
// Project Creation Types
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

// =====================================
// Utility Functions (型変換用)
// =====================================

/**
 * Figma API形式 → Frontend形式に変換
 */
export function convertFigmaFile(raw: FigmaFileRaw): FigmaFile {
  return {
    key: raw.key,
    name: raw.name,
    thumbnailUrl: raw.thumbnail_url,
    lastModified: raw.last_modified,
  };
}