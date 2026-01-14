/**
 * FIGLEAN Frontend - HTML生成関連型定義
 * HTML生成に関する型定義を提供
 * 更新日時: 2026年1月14日
 */

/**
 * HTML生成フレームワーク
 */
export type Framework = 'HTML_TAILWIND' | 'REACT_JSX' | 'VUE_SFC';

/**
 * 生成ステータス
 */
export type GenerationStatus = 'NOT_GENERATED' | 'GENERATING' | 'COMPLETED' | 'FAILED';

/**
 * プロジェクトBreakpoint
 */
export interface ProjectBreakpoints {
  mobile?: number;
  tablet?: number;
  desktop?: number;
  wide?: number;
}

/**
 * HTML生成オプション
 */
export interface HTMLGeneratorOptions {
  framework: Framework;
  includeResponsive: boolean;
  includeGrid: boolean;
  breakpoints?: ProjectBreakpoints;
  minifyOutput?: boolean;
  includeComments?: boolean;
}

/**
 * HTMLメタデータ
 */
export interface HTMLMetadata {
  totalLines: number;
  tailwindClasses: number;
  componentCount: number;
  reproductionRate: number;
  codeQualityScore: number;
}

/**
 * HTML生成結果
 */
export interface GeneratedHTMLResult {
  id: string;
  projectId: string;
  userId: string;
  framework: Framework;
  includeResponsive: boolean;
  includeGrid: boolean;
  breakpoints?: ProjectBreakpoints;
  htmlCode: string;
  cssCode?: string;
  metadata: HTMLMetadata;
  generationStatus: GenerationStatus;
  generationTimeMs: number;
  errorMessage?: string;
  previewUrl: string;
  downloadUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * HTML生成リクエスト
 */
export interface GenerateHTMLRequest {
  framework: Framework;
  includeResponsive: boolean;
  includeGrid: boolean;
  breakpoints?: ProjectBreakpoints;
  minifyOutput?: boolean;
  includeComments?: boolean;
}

/**
 * HTML生成レスポンス
 */
export interface GenerateHTMLResponse {
  generatedId: string;
  htmlCode: string;
  metadata: HTMLMetadata;
  generationTimeMs: number;
  previewUrl: string;
  downloadUrl: string;
}

/**
 * HTML生成履歴アイテム
 */
export interface HTMLHistoryItem {
  id: string;
  framework: Framework;
  generationStatus: GenerationStatus;
  metadata: HTMLMetadata;
  generationTimeMs: number;
  createdAt: string;
}

/**
 * HTML生成履歴レスポンス
 */
export interface HTMLHistoryResponse {
  history: HTMLHistoryItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}