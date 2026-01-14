/**
 * FIGLEAN Frontend - データモデル型定義（完全最終版）
 * 重複削除 + TypeScriptエラー修正 + Prisma完全一致
 * 更新日時: 2026年1月14日
 */

// =====================================
// Enums
// =====================================

export enum UserPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  TEAM = 'TEAM',
}

export enum ProjectStatus {
  PENDING = 'PENDING',
  IMPORTING = 'IMPORTING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ViolationSeverity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
}

export enum RuleCategory {
  AUTO_LAYOUT = 'AUTO_LAYOUT',
  COMPONENT = 'COMPONENT',
  SPACING = 'SPACING',
  RESPONSIVE = 'RESPONSIVE',
  SEMANTIC = 'SEMANTIC',
  TEXT = 'TEXT',
  COLOR = 'COLOR',
}

export enum GeneratorFormat {
  HTML = 'HTML',
  REACT = 'REACT',
  VUE = 'VUE',
}

/**
 * @deprecated Backend BreakPredictionではseverityを使用
 */
export enum PredictionRisk {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// =====================================
// User Model
// =====================================

export interface User {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  hasFigmaToken: boolean;
  figmaUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

// =====================================
// Project Model
// =====================================

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  
  // Figma情報
  figmaFileKey: string;
  figmaFileUrl: string | null;
  figmaFileName: string | null;
  figmaNodeId: string | null;
  
  // スコア（最新診断結果のキャッシュ）
  figleanScore: number | null;
  layoutScore: number | null;
  componentScore: number | null;
  responsiveScore: number | null;
  semanticScore: number | null;
  
  // 診断状態
  analysisStatus: ProjectStatus;
  lastAnalyzedAt: string | null;
  analysisCount: number;
  
  // HTML生成可否
  htmlGeneratable: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  analysis?: Analysis;
  violations?: Violation[];
  predictions?: Prediction[];
  suggestions?: Suggestion[];
}

export interface Breakpoint {
  name: string;
  minWidth: number;
  maxWidth: number | null;
}

// =====================================
// Analysis Model
// =====================================

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

export interface ScoreBreakdown {
  autoLayout: number;
  component: number;
  responsive: number;
  semantic: number;
}

// =====================================
// Violation Model
// =====================================

export interface Violation {
  id: string;
  projectId: string;
  analysisId: string | null;
  frameName: string;
  frameId: string | null;
  framePath: string | null;
  ruleId: string;
  ruleName: string;
  ruleCategory: RuleCategory | string;
  severity: ViolationSeverity;
  description: string;
  impact: string | null;
  suggestion: string | null;
  fixSteps: any | null;
  detectedValue: string | null;
  expectedValue: string | null;
  commentPosted: boolean;
  figmaCommentId: string | null;
  createdAt: string;
}

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

export interface Prediction {
  id: string;
  projectId: string;
  breakType: string;
  breakTitle: string;
  breakDescription: string;
  affectedFrame: string;
  affectedFrameId: string | null;
  breakpoint: string | null;
  screenWidth: number | null;
  fixSuggestion: string;
  severity: ViolationSeverity;
  createdAt: string;
}

// =====================================
// Suggestion Model
// =====================================

export interface Suggestion {
  id: string;
  projectId: string;
  priority: number;
  title: string;
  description: string;
  targetFrame: string;
  targetFrameId: string | null;
  impactLevel: string;
  scoreImprovement: number;
  estimatedTime: string | null;
  difficulty: string | null;
  actionSteps: any[] | null;
  beforeValue: string | null;
  afterValue: string | null;
  createdAt: string;
}

// =====================================
// Generator Model
// =====================================

export interface GeneratorHistory {
  id: string;
  projectId: string;
  format: GeneratorFormat;
  code: string;
  generatedAt: string;
}

export interface GenerateRequest {
  projectId: string;
  format: GeneratorFormat;
  includeComments?: boolean;
  minifyCode?: boolean;
}

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
// Helper Types
// =====================================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type SortOrder = 'asc' | 'desc';

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  minScore?: number;
  maxScore?: number;
  dateRange?: DateRange;
  search?: string;
}