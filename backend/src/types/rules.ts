// =====================================
// backend/src/types/rules.ts
// ルールエンジン型定義 - FIGLEAN Phase 6.4
// 作成日時: 2026年1月11日
// 依存関係: figmaApiService (FigmaNode型)
// 説明: ルールチェックエンジンの型定義とインターフェース
// =====================================

import type { FigmaNode } from '../services/figmaApiService';

// =====================================
// Enums
// =====================================

/**
 * ルールID（10種類の基本ルール）
 */
export enum RuleId {
  AUTO_LAYOUT_REQUIRED = 'AUTO_LAYOUT_REQUIRED',
  ABSOLUTE_POSITIONING = 'ABSOLUTE_POSITIONING',
  FIXED_SIZE_DETECTED = 'FIXED_SIZE_DETECTED',
  WRAP_OFF = 'WRAP_OFF',
  NON_SEMANTIC_NAME = 'NON_SEMANTIC_NAME',
  DEPTH_TOO_DEEP = 'DEPTH_TOO_DEEP',
  HUG_FILL_VIOLATION = 'HUG_FILL_VIOLATION',
  MIN_WIDTH_MISSING = 'MIN_WIDTH_MISSING',
  COMPONENT_NOT_USED = 'COMPONENT_NOT_USED',
  LAYER_ABUSE = 'LAYER_ABUSE'
}

/**
 * ルールカテゴリ
 */
export enum RuleCategory {
  LAYOUT = 'LAYOUT',           // レイアウト構造
  SIZE = 'SIZE',               // サイズ設定
  RESPONSIVE = 'RESPONSIVE',   // レスポンシブ
  SEMANTIC = 'SEMANTIC',       // 命名規則
  COMPONENT = 'COMPONENT'      // コンポーネント化
}

/**
 * 違反の重要度
 */
export enum Severity {
  CRITICAL = 'CRITICAL',  // 致命的: HTML生成不可
  MAJOR = 'MAJOR',        // 重大: レスポンシブ問題
  MINOR = 'MINOR',        // 軽微: 命名規則等
  INFO = 'INFO'           // 情報: 推奨改善
}

// =====================================
// Rule Definition
// =====================================

/**
 * ルール定義
 */
export interface RuleDefinition {
  id: RuleId;
  name: string;
  category: RuleCategory;
  severity: Severity;
  description: string;
  impactTemplate: string;
  scoreImpact: number;  // スコアへの影響度（1-10）
}

/**
 * ルールチェック結果
 */
export interface RuleCheckResult {
  passed: boolean;
  violations: RuleViolation[];
}

/**
 * ルール違反詳細
 */
export interface RuleViolation {
  ruleId: RuleId;
  ruleName: string;
  severity: Severity;
  category: RuleCategory;
  frameName: string;
  frameId: string;
  description: string;
  impact: string;
  suggestion?: string;
  
  // デバッグ情報
  nodeType?: string;
  detectedValue?: string;
  expectedValue?: string;
}

// =====================================
// Rule Checker Interface
// =====================================

/**
 * ルールチェッカーインターフェース
 */
export interface RuleChecker {
  /**
   * ルール定義を取得
   */
  getDefinition(): RuleDefinition;
  
  /**
   * ノードをチェック
   * @param node - チェック対象のFigmaノード
   * @param context - チェックコンテキスト
   * @returns チェック結果
   */
  check(node: FigmaNode, context: RuleCheckContext): RuleCheckResult;
}

/**
 * ルールチェックコンテキスト
 */
export interface RuleCheckContext {
  depth: number;           // 現在の階層深度
  parentNode?: FigmaNode;  // 親ノード
  rootNode: FigmaNode;     // ルートノード
  allNodes: FigmaNode[];   // 全ノード配列（参照用）
}

// =====================================
// Scoring
// =====================================

/**
 * スコア計算結果
 */
export interface ScoreResult {
  // 総合スコア
  figleanScore: number;      // 0-100
  
  // カテゴリ別スコア
  layoutScore: number;       // レイアウト
  componentScore: number;    // コンポーネント
  responsiveScore: number;   // レスポンシブ
  semanticScore: number;     // セマンティック
  
  // 違反統計
  violations: {
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
  
  // 生成可否判定
  canGenerateHTML: boolean;  // 90%以上
  canUseGrid: boolean;       // 100%のみ
}

/**
 * カテゴリ別スコア詳細
 */
export interface CategoryScore {
  category: RuleCategory;
  score: number;             // 0-100
  maxScore: number;          // 最大スコア
  violations: number;        // 違反数
  weight: number;            // 重み付け
}

// =====================================
// Analysis Result
// =====================================

/**
 * 解析結果サマリー
 */
export interface AnalysisResultSummary {
  projectId: string;
  totalFrames: number;
  analyzedFrames: number;
  
  scoreResult: ScoreResult;
  violations: RuleViolation[];
  
  // 統計情報
  stats: {
    autoLayoutFrames: number;
    componentUsage: number;
    semanticNames: number;
    depthAverage: number;
  };
}

// =====================================
// Export
// =====================================

export default {
  RuleId,
  RuleCategory,
  Severity
};