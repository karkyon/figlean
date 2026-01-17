// =====================================
// ファイルパス: frontend/src/types/autofix.ts
// 概要: AutoFix機能の型定義
// 機能説明: Backend APIレスポンス型とFrontend用型定義
// 作成日: 2026-01-17
// 更新日: 2026-01-17 - 初回作成
// 依存関係: なし
// =====================================

// =====================================
// Enum定義
// =====================================

export enum AutoFixCategory {
  AUTO_LAYOUT = 'AUTO_LAYOUT',
  SIZE_CONSTRAINT = 'SIZE_CONSTRAINT',
  NAMING = 'NAMING',
  COMPONENT = 'COMPONENT',
  STYLE = 'STYLE',
}

export enum AutoFixType {
  // AUTO_LAYOUT
  ADD_AUTO_LAYOUT = 'ADD_AUTO_LAYOUT',
  CHANGE_DIRECTION = 'CHANGE_DIRECTION',
  SET_GAP = 'SET_GAP',
  ENABLE_WRAP = 'ENABLE_WRAP',
  
  // SIZE_CONSTRAINT
  CHANGE_TO_FILL = 'CHANGE_TO_FILL',
  CHANGE_TO_HUG = 'CHANGE_TO_HUG',
  REMOVE_FIXED_SIZE = 'REMOVE_FIXED_SIZE',
  
  // NAMING
  RENAME_SEMANTIC = 'RENAME_SEMANTIC',
  
  // COMPONENT
  CREATE_COMPONENT = 'CREATE_COMPONENT',
  DETACH_INSTANCE = 'DETACH_INSTANCE',
  
  // STYLE
  UNIFY_COLORS = 'UNIFY_COLORS',
  UNIFY_TYPOGRAPHY = 'UNIFY_TYPOGRAPHY',
}

export enum AutoFixStatus {
  PENDING = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

// =====================================
// Config関連
// =====================================

export interface AutoFixConfig {
  enableAutoLayout: boolean;
  enableSizeConstraint: boolean;
  enableNaming: boolean;
  enableComponent: boolean;
  enableStyle: boolean;
  enabledFixTypes: Record<AutoFixType, boolean>;
  autoDeleteComments: boolean;
}

export interface UpdateAutoFixConfigRequest {
  enableAutoLayout?: boolean;
  enableSizeConstraint?: boolean;
  enableNaming?: boolean;
  enableComponent?: boolean;
  enableStyle?: boolean;
  enabledFixTypes?: Partial<Record<AutoFixType, boolean>>;
  autoDeleteComments?: boolean;
}

// =====================================
// Preview関連
// =====================================

export interface AutoFixPreviewRequest {
  violationIds: string[];
  deleteComments?: boolean;
}

export interface AutoFixPreviewItem {
  violationId: string;
  category: AutoFixCategory;
  type: AutoFixType;
  nodeName: string;
  nodeId: string;
  before: Record<string, any>;
  after: Record<string, any>;
  estimatedDuration: number;
}

export interface AutoFixPreviewResponse {
  totalCount: number;
  estimatedDuration: number;
  items: AutoFixPreviewItem[];
  scoreImpact: {
    currentScore: number;
    estimatedScore: number;
    improvement: number;
  };
}

// =====================================
// Execute関連
// =====================================

export interface AutoFixExecuteRequest {
  violationIds: string[];
  deleteComments?: boolean;
}

export interface AutoFixItemResult {
  id: string;
  violationId: string;
  category: AutoFixCategory;
  type: AutoFixType;
  status: AutoFixStatus;
  nodeName: string;
  nodeId: string;
  before: Record<string, any>;
  after: Record<string, any>;
  error?: string;
  executedAt: string;
}

export interface AutoFixExecuteResponse {
  historyId: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  items: AutoFixItemResult[];
}

// =====================================
// History関連
// =====================================

export interface AutoFixHistory {
  id: string;
  projectId: string;
  userId: string;
  isIndividual: boolean;
  violationId: string | null;
  fixedCount: number;
  fixedViolations: string[];
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  status: AutoFixStatus;
  figmaChanges: Record<string, any>;
  deleteComments: boolean;
  executedAt: string;
  completedAt: string | null;
  rolledBackAt: string | null;
}

export interface GetHistoriesRequest {
  limit?: number;
  offset?: number;
  status?: AutoFixStatus;
}

export interface GetHistoriesResponse {
  histories: AutoFixHistory[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// =====================================
// Rollback関連
// =====================================

export interface RollbackRequest {
  historyIds: string[];
}

export interface RollbackResponse {
  successCount: number;
  failedCount: number;
  results: Array<{
    historyId: string;
    success: boolean;
    error?: string;
  }>;
}