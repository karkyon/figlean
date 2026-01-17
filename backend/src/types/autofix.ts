// =====================================
// ファイルパス: backend/src/types/autofix.ts
// 概要: AutoFix機能の型定義
// 機能説明: AutoFix実行リクエスト、レスポンス、内部処理用の型定義
// 作成日: 2026-01-17
// 更新日: 2026-01-17
// 更新理由: 新規作成
// 依存関係: なし
// =====================================

// =====================================
// Enum型定義
// =====================================

export enum AutoFixCategory {
  AUTO_LAYOUT = 'AUTO_LAYOUT',
  SIZE_CONSTRAINT = 'SIZE_CONSTRAINT',
  NAMING = 'NAMING',
  COMPONENT = 'COMPONENT',
  STYLE = 'STYLE',
}

export enum AutoFixType {
  // Auto Layout関連
  ADD_AUTO_LAYOUT = 'ADD_AUTO_LAYOUT',
  CHANGE_DIRECTION = 'CHANGE_DIRECTION',
  SET_GAP = 'SET_GAP',
  ENABLE_WRAP = 'ENABLE_WRAP',
  
  // サイズ制約関連
  CHANGE_TO_FILL = 'CHANGE_TO_FILL',
  CHANGE_TO_HUG = 'CHANGE_TO_HUG',
  REMOVE_FIXED_SIZE = 'REMOVE_FIXED_SIZE',
  
  // 命名規則関連
  RENAME_SEMANTIC = 'RENAME_SEMANTIC',
  
  // Component化関連
  CREATE_COMPONENT = 'CREATE_COMPONENT',
  DETACH_INSTANCE = 'DETACH_INSTANCE',
  
  // スタイル統一関連
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
// AutoFix設定関連型
// =====================================

export interface AutoFixConfigDto {
  enableAutoLayout: boolean;
  enableSizeConstraint: boolean;
  enableNaming: boolean;
  enableComponent: boolean;
  enableStyle: boolean;
  enabledFixTypes: Record<AutoFixType, boolean>;
  autoDeleteComments: boolean;
}

export interface UpdateAutoFixConfigDto {
  enableAutoLayout?: boolean;
  enableSizeConstraint?: boolean;
  enableNaming?: boolean;
  enableComponent?: boolean;
  enableStyle?: boolean;
  enabledFixTypes?: Record<string, boolean>;
  autoDeleteComments?: boolean;
}

// =====================================
// AutoFix実行関連型
// =====================================

export interface AutoFixPreviewRequestDto {
  violationIds: string[]; // プレビューする違反ID配列
  deleteComments?: boolean; // コメント削除するか
}

export interface AutoFixExecuteRequestDto {
  violationIds: string[]; // 修正する違反ID配列
  deleteComments?: boolean; // コメント削除するか
  categories?: AutoFixCategory[]; // 実行するカテゴリ（省略時は全カテゴリ）
  fixTypes?: AutoFixType[]; // 実行する修正タイプ（省略時はユーザー設定に従う）
}

export interface AutoFixIndividualRequestDto {
  violationId: string; // 個別修正する違反ID
  deleteComment?: boolean; // コメント削除するか
}

// =====================================
// AutoFix修正内容型
// =====================================

export interface AutoFixChange {
  category: AutoFixCategory;
  fixType: AutoFixType;
  figmaNodeId: string;
  frameName: string;
  beforeValue: any;
  afterValue: any;
}

export interface AutoFixPreviewItem {
  violationId: string;
  category: AutoFixCategory;
  fixType: AutoFixType;
  frameName: string;
  figmaNodeId: string;
  beforeValue: any;
  afterValue: any;
  description: string; // 修正内容の説明
}

export interface AutoFixPreviewResponseDto {
  projectId: string;
  previewItems: AutoFixPreviewItem[];
  totalCount: number;
  estimatedTime: number; // 推定実行時間（秒）
  beforeScore: number;
  expectedScore: number; // 修正後の予想スコア
  scoreDelta: number;
}

// =====================================
// AutoFix実行結果型
// =====================================

export interface AutoFixExecutionResult {
  historyId: string;
  projectId: string;
  status: AutoFixStatus;
  fixedCount: number;
  failedCount: number;
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  executedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface AutoFixItemResult {
  id: string;
  violationId: string;
  category: AutoFixCategory;
  fixType: AutoFixType;
  frameName: string;
  figmaNodeId: string;
  status: AutoFixStatus;
  beforeValue: any;
  afterValue: any;
  errorMessage?: string;
}

export interface AutoFixExecuteResponseDto {
  historyId: string;
  status: AutoFixStatus;
  fixedCount: number;
  failedCount: number;
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  items: AutoFixItemResult[];
  message: string;
}

// =====================================
// AutoFix履歴関連型
// =====================================

export interface AutoFixHistoryListQuery {
  projectId?: string;
  limit?: number;
  offset?: number;
  status?: AutoFixStatus;
}

export interface AutoFixHistoryDto {
  id: string;
  projectId: string;
  userId: string;
  isIndividual: boolean;
  violationId?: string;
  fixedCount: number;
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  status: AutoFixStatus;
  deleteComments: boolean;
  deletedCommentCount?: number;
  isRolledBack: boolean;
  rollbackAt?: Date;
  executedAt: Date;
  completedAt?: Date;
  items: AutoFixItemResult[];
}

export interface AutoFixHistoryListResponseDto {
  histories: AutoFixHistoryDto[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// =====================================
// Rollback関連型
// =====================================

export interface AutoFixRollbackRequestDto {
  historyIds: string[]; // ロールバックする履歴ID配列
}

export interface AutoFixRollbackResponseDto {
  successCount: number;
  failedCount: number;
  rolledBackHistories: string[];
  failedHistories: {
    historyId: string;
    reason: string;
  }[];
  currentScore: number;
  message: string;
}

// =====================================
// Figma API連携用型
// =====================================

export interface FigmaNodeUpdate {
  nodeId: string;
  properties: Record<string, any>;
}

export interface FigmaModificationRequest {
  fileKey: string;
  updates: FigmaNodeUpdate[];
}

export interface FigmaModificationResponse {
  success: boolean;
  modifiedNodes: string[];
  errors?: {
    nodeId: string;
    error: string;
  }[];
}

// =====================================
// 内部処理用型
// =====================================

export interface ViolationToFixMapping {
  violationId: string;
  ruleId: string;
  severity: string;
  frameId: string;
  frameName: string;
  figmaFileKey: string;
  figmaNodeId: string;
  category: AutoFixCategory;
  fixType: AutoFixType;
  beforeValue: any;
  afterValue: any;
}

export interface AutoFixExecutionContext {
  projectId: string;
  userId: string;
  figmaAccessToken: string;
  violations: ViolationToFixMapping[];
  config: AutoFixConfigDto;
  deleteComments: boolean;
}