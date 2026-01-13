/**
 * FIGLEAN Frontend - データモデル型定義
 * Backend APIのレスポンスに対応する型定義
 * 作成日時: 2026年1月12日
 */

// =====================================
// Enums
// =====================================

/**
 * ユーザープラン
 */
export enum UserPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  TEAM = 'TEAM',
}

/**
 * プロジェクトステータス
 */
export enum ProjectStatus {
  PENDING = 'PENDING',           // インポート待ち
  IMPORTING = 'IMPORTING',       // インポート中
  ANALYZING = 'ANALYZING',       // 解析中
  COMPLETED = 'COMPLETED',       // 完了
  FAILED = 'FAILED',             // 失敗
}

/**
 * ルール違反の重要度
 */
export enum ViolationSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

/**
 * 崩れ予測のリスクレベル
 */
export enum PredictionRisk {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * HTML生成フォーマット
 */
export enum GeneratorFormat {
  HTML = 'HTML',
  REACT = 'REACT',
  VUE = 'VUE',
}

// =====================================
// User Model
// =====================================

/**
 * ユーザー
 */
export interface User {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  hasFigmaToken: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================================
// Project Model
// =====================================

/**
 * プロジェクト
 */
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  figmaFileKey: string;
  figmaFileUrl: string | null;
  figmaFileName: string | null;
  figmaNodeId: string | null;
  status: ProjectStatus;
  score: number | null;
  breakpoints: Breakpoint[];
  createdAt: string;
  updatedAt: string;
}

/**
 * プロジェクト詳細（診断結果含む）
 */
export interface ProjectDetail extends Project {
  analysis?: Analysis;
  violations?: Violation[];
  predictions?: Prediction[];
  suggestions?: Suggestion[];
}

/**
 * ブレークポイント設定
 */
export interface Breakpoint {
  name: string;        // 'mobile' | 'tablet' | 'desktop'
  minWidth: number;    // px
  maxWidth: number | null;  // px
}

// =====================================
// Analysis Model
// =====================================

/**
 * 診断結果サマリー
 */
export interface Analysis {
  id: string;
  projectId: string;
  score: number;
  totalViolations: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  canGenerateHtml: boolean;
  canGenerateGrid: boolean;
  analyzedAt: string;
  scoreBreakdown: ScoreBreakdown;
}

/**
 * スコア内訳
 */
export interface ScoreBreakdown {
  autoLayout: number;           // 30点満点
  component: number;            // 25点満点
  responsive: number;           // 25点満点
  semantic: number;             // 20点満点
}

// =====================================
// Violation Model
// =====================================

/**
 * ルール違反
 */
export interface Violation {
  id: string;
  projectId: string;
  ruleId: string;
  ruleName: string;
  ruleCategory: string;
  severity: ViolationSeverity;
  message: string;
  frameId: string;
  frameName: string;
  nodeId: string;
  nodeName: string;
  details: Record<string, any>;
  createdAt: string;
}

/**
 * 違反統計
 */
export interface ViolationStatistics {
  totalCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  byCategoryCount: Record<string, number>;
}

// =====================================
// Prediction Model
// =====================================

/**
 * 崩れ予測
 */
export interface Prediction {
  id: string;
  projectId: string;
  frameId: string;
  frameName: string;
  nodeId: string;
  nodeName: string;
  riskLevel: PredictionRisk;
  breakpoint: string;          // 'mobile' | 'tablet' | 'desktop'
  predictionText: string;
  reason: string;
  createdAt: string;
}

// =====================================
// Suggestion Model
// =====================================

/**
 * 改善提案
 */
export interface Suggestion {
  id: string;
  projectId: string;
  violationId: string | null;
  category: string;
  priority: number;
  title: string;
  description: string;
  actionItems: string[];
  estimatedImpact: number;     // スコア改善見込み
  createdAt: string;
}

// =====================================
// Generator Model (Phase 2)
// =====================================

/**
 * HTML生成履歴
 */
export interface GeneratorHistory {
  id: string;
  projectId: string;
  format: GeneratorFormat;
  code: string;
  generatedAt: string;
}

/**
 * HTML生成リクエスト
 */
export interface GenerateRequest {
  projectId: string;
  format: GeneratorFormat;
  includeComments?: boolean;
  minifyCode?: boolean;
}

/**
 * HTML生成レスポンス
 */
export interface GenerateResponse {
  code: string;
  format: GeneratorFormat;
  stats: {
    linesOfCode: number;
    fileSize: number;
    componentsCount: number;
  };
}

// =====================================
// Figma Integration
// =====================================

/**
 * Figmaファイル情報
 */
export interface FigmaFile {
  key: string;
  name: string;
  thumbnailUrl: string | null;
  lastModified: string;
}

/**
 * Figmaファイル詳細
 */
export interface FigmaFileDetail {
  key: string;
  name: string;
  pages: FigmaPage[];
}

/**
 * Figmaページ
 */
export interface FigmaPage {
  id: string;
  name: string;
  frameCount: number;
}

/**
 * Figmaインポートリクエスト
 */
export interface FigmaImportRequest {
  projectName: string;
  description?: string;
  figmaFileKey: string;
  figmaFileUrl?: string;
  figmaFileName?: string;
  figmaNodeId?: string;
  selectedPages?: string[];
}

/**
 * インポート進捗
 */
export interface ImportProgress {
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;             // 0-100
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  message: string | null;
  errorMessage: string | null;
}

// =====================================
// Helper Types
// =====================================

/**
 * ページネーション情報
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * ソート順序
 */
export type SortOrder = 'asc' | 'desc';

/**
 * 日付範囲
 */
export interface DateRange {
  startDate?: string;
  endDate?: string;
}

/**
 * フィルター条件（プロジェクト一覧用）
 */
export interface ProjectFilters {
  status?: ProjectStatus;
  minScore?: number;
  maxScore?: number;
  dateRange?: DateRange;
  search?: string;
}
