/**
 * FIGLEAN Frontend - データモデル型定義（完全修正版）
 * Backend Prisma Schemaに完全一致 + 既存機能を保持
 * 作成日時: 2026年1月12日
 * 更新日時: 2026年1月14日 - Violation/Prediction/SuggestionをBackendに一致
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
 * ルール違反の重要度（Prisma: Severity）
 */
export enum ViolationSeverity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',      // 旧: WARNING
  MINOR = 'MINOR',      // 旧: INFO
}

/**
 * ルールカテゴリー（Prisma: RuleCategory）
 */
export enum RuleCategory {
  AUTO_LAYOUT = 'AUTO_LAYOUT',
  COMPONENT = 'COMPONENT',
  SPACING = 'SPACING',
  RESPONSIVE = 'RESPONSIVE',
  SEMANTIC = 'SEMANTIC',
  TEXT = 'TEXT',
  COLOR = 'COLOR',
}

/**
 * 崩れ予測のリスクレベル（参考用・将来削除予定）
 * @deprecated Backend BreakPredictionではseverityを使用
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
// Violation Model（Prisma: RuleViolation）
// =====================================

/**
 * ルール違反（Backend: RuleViolation）
 * 🔧 修正版: Backendスキーマに完全一致
 */
export interface Violation {
  id: string;
  projectId: string;
  analysisId: string | null;
  
  // Frame情報
  frameName: string;
  frameId: string | null;
  framePath: string | null;
  
  // ルール情報
  ruleId: string;
  ruleName: string;
  ruleCategory: RuleCategory | string;  // string互換性のため
  severity: ViolationSeverity;
  
  // 説明・影響
  description: string;
  impact: string | null;
  
  // 修正提案
  suggestion: string | null;
  fixSteps: any | null;  // Json
  
  // 詳細情報
  detectedValue: string | null;
  expectedValue: string | null;
  
  // Figmaコメント投稿状態
  commentPosted: boolean;
  figmaCommentId: string | null;
  
  createdAt: string;
  
  // 🔧 旧フィールド（後方互換性のため残す・将来削除予定）
  /** @deprecated Use frameName instead */
  nodeId?: string;
  /** @deprecated Use frameName instead */
  nodeName?: string;
  /** @deprecated Use description instead */
  message?: string;
  /** @deprecated Use fixSteps instead */
  details?: Record<string, any>;
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
// Prediction Model（Prisma: BreakPrediction）
// =====================================

/**
 * 崩壊予測（Backend: BreakPrediction）
 * 🔧 修正版: Backendスキーマに完全一致
 */
export interface Prediction {
  id: string;
  projectId: string;
  
  // 予測内容
  breakType: string;           // HORIZONTAL_SCROLL, FLEX_WRAP_FAILURE, etc.
  breakTitle: string;
  breakDescription: string;
  
  // 影響範囲
  affectedFrame: string;
  affectedFrameId: string | null;
  
  // ブレークポイント情報
  breakpoint: string | null;   // 'mobile' | 'tablet' | 'desktop'
  screenWidth: number | null;
  
  // 修正提案
  fixSuggestion: string;
  
  // 重要度
  severity: ViolationSeverity;
  
  createdAt: string;
  
  // 🔧 旧フィールド（後方互換性のため残す・将来削除予定）
  /** @deprecated Use affectedFrame instead */
  frameId?: string;
  /** @deprecated Use affectedFrame instead */
  frameName?: string;
  /** @deprecated Use severity instead */
  riskLevel?: PredictionRisk;
  /** @deprecated Use breakDescription instead */
  predictionText?: string;
  /** @deprecated Use fixSuggestion instead */
  reason?: string;
  /** @deprecated Not used in backend */
  nodeId?: string;
  /** @deprecated Not used in backend */
  nodeName?: string;
}

// =====================================
// Suggestion Model（Prisma: ImprovementSuggestion）
// =====================================

/**
 * 改善提案（Backend: ImprovementSuggestion）
 * 🔧 修正版: Backendスキーマに完全一致
 */
export interface Suggestion {
  id: string;
  projectId: string;
  
  // 提案順序
  priority: number;  // Int（数値！）
  
  // 提案内容
  title: string;
  description: string;
  
  // 対象Frame
  targetFrame: string;
  targetFrameId: string | null;
  
  // 改善効果
  impactLevel: string;         // 'HIGH' | 'MEDIUM' | 'LOW'
  scoreImprovement: number;
  
  // 作業量
  estimatedTime: string | null;
  difficulty: string | null;
  
  // 具体的な手順（Json配列）
  actionSteps: any[] | null;   // Json
  
  // ビフォー・アフター
  beforeValue: string | null;
  afterValue: string | null;
  
  createdAt: string;
  
  // 🔧 旧フィールド（後方互換性のため残す・将来削除予定）
  /** @deprecated Use actionSteps instead */
  actionItems?: string[];
  /** @deprecated Use scoreImprovement instead */
  estimatedImpact?: number;
  /** @deprecated Not used in backend */
  violationId?: string | null;
  /** @deprecated Use impactLevel instead */
  category?: string;
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