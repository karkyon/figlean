// =====================================
// backend/src/rules/BaseRuleChecker.ts
// ルールチェッカー基底クラス - FIGLEAN Phase 6.4
// 作成日時: 2026年1月11日
// 依存関係: types/rules, figmaApiService
// 説明: 全ルールチェッカーの基底クラスとユーティリティ関数
// =====================================

import type { FigmaNode } from '../services/figmaApiService';
import type {
  RuleDefinition,
  RuleChecker,
  RuleCheckResult,
  RuleCheckContext,
  RuleViolation
} from '../types/rules';

/**
 * ルールチェッカー基底クラス
 */
export abstract class BaseRuleChecker implements RuleChecker {
  protected definition: RuleDefinition;

  constructor(definition: RuleDefinition) {
    this.definition = definition;
  }

  /**
   * ルール定義を取得
   */
  getDefinition(): RuleDefinition {
    return this.definition;
  }

  /**
   * ノードをチェック（サブクラスで実装）
   */
  abstract check(node: FigmaNode, context: RuleCheckContext): RuleCheckResult;

  /**
   * 違反を作成
   */
  protected createViolation(
    node: FigmaNode,
    description: string,
    impact: string,
    suggestion?: string,
    detectedValue?: string,
    expectedValue?: string
  ): RuleViolation {
    return {
      ruleId: this.definition.id,
      ruleName: this.definition.name,
      severity: this.definition.severity,
      category: this.definition.category,
      frameName: node.name,
      frameId: node.id,
      description,
      impact,
      suggestion,
      nodeType: node.type,
      detectedValue,
      expectedValue
    };
  }

  /**
   * 違反なしの結果を返す
   */
  protected passed(): RuleCheckResult {
    return {
      passed: true,
      violations: []
    };
  }

  /**
   * 違反ありの結果を返す
   */
  protected failed(...violations: RuleViolation[]): RuleCheckResult {
    return {
      passed: false,
      violations
    };
  }
}

// =====================================
// Utility Functions
// =====================================

/**
 * ノードがFrameタイプか判定
 */
export function isFrame(node: FigmaNode): boolean {
  return node.type === 'FRAME';
}

/**
 * ノードがコンポーネントか判定
 */
export function isComponent(node: FigmaNode): boolean {
  return node.type === 'COMPONENT' || node.type === 'INSTANCE';
}

/**
 * Auto Layoutが設定されているか判定
 */
export function hasAutoLayout(node: FigmaNode): boolean {
  return node.layoutMode !== undefined && node.layoutMode !== 'NONE';
}

/**
 * セマンティックな命名か判定
 */
export function isSemanticName(name: string): boolean {
  // セマンティックパターン
  const semanticPatterns = [
    /^(header|footer|nav|section|article|aside|main)/i,
    /^(hero|banner|card|modal|dialog|overlay)/i,
    /^(button|input|form|select|checkbox|radio)/i,
    /^(list|item|grid|row|column|cell)/i,
    /^[a-z][a-zA-Z0-9]*(-[a-z][a-zA-Z0-9]*)*$/  // kebab-case
  ];

  // 非セマンティックパターン
  const nonSemanticPatterns = [
    /^Frame\s+\d+$/i,           // "Frame 123"
    /^Group\s+\d+$/i,           // "Group 123"
    /^Rectangle\s+\d+$/i,       // "Rectangle 123"
    /^Component\s+\d+$/i,       // "Component 123"
    /^(未|無|名|title)$/i       // デフォルト名
  ];

  // 非セマンティックパターンにマッチしたらfalse
  if (nonSemanticPatterns.some(pattern => pattern.test(name))) {
    return false;
  }

  // セマンティックパターンにマッチしたらtrue
  return semanticPatterns.some(pattern => pattern.test(name));
}

/**
 * 絶対配置が使われているか判定
 */
export function hasAbsolutePositioning(node: FigmaNode): boolean {
  // Auto Layoutが無い場合は絶対配置とみなす
  if (!hasAutoLayout(node)) {
    return true;
  }

  // 制約が'SCALE'の場合も絶対配置的
  if (node.constraints?.horizontal === 'SCALE' || 
      node.constraints?.vertical === 'SCALE') {
    return true;
  }

  return false;
}

/**
 * 固定サイズが使われているか判定
 */
export function hasFixedSize(node: FigmaNode): boolean {
  // Auto Layoutの場合
  if (hasAutoLayout(node)) {
    // FIXED sizing mode
    if (node.primaryAxisSizingMode === 'FIXED' || 
        node.counterAxisSizingMode === 'FIXED') {
      return true;
    }
  }

  // absoluteBoundingBoxがあるが、Auto Layoutが無い場合
  if (node.absoluteBoundingBox && !hasAutoLayout(node)) {
    return true;
  }

  return false;
}

/**
 * Wrapが有効か判定
 */
export function hasWrapEnabled(node: FigmaNode): boolean {
  return node.layoutWrap === 'WRAP';
}

/**
 * 階層深度を計算
 */
export function calculateDepth(node: FigmaNode, rootNode: FigmaNode): number {
  let depth = 0;
  let current: FigmaNode | undefined = node;

  while (current && current.id !== rootNode.id) {
    depth++;
    // 親ノードを探す（実際の実装では親参照が必要）
    current = undefined;  // TODO: 親ノードの参照方法を実装
  }

  return depth;
}

/**
 * 最小幅が設定されているか判定
 */
export function hasMinWidth(node: FigmaNode): boolean {
  // TODO: Figma APIで最小幅の情報が取得できるか確認
  // 現在は簡易実装
  return hasAutoLayout(node) && node.counterAxisSizingMode === 'AUTO';
}

/**
 * レイヤーが乱用されているか判定
 */
export function hasLayerAbuse(node: FigmaNode): boolean {
  // 子要素が多すぎる場合
  if (node.children && node.children.length > 50) {
    return true;
  }

  // ネストが深すぎる場合（10階層以上）
  // TODO: 実際の深度計算実装

  return false;
}

/**
 * コンポーネント化すべきパターンか判定
 */
export function shouldBeComponent(node: FigmaNode, _context: RuleCheckContext): boolean {
  // 既にコンポーネントの場合はfalse
  if (isComponent(node)) {
    return false;
  }

  // 同じ構造のノードが3つ以上ある場合
  // TODO: 構造比較ロジック実装（contextを使用予定）

  // ボタン、カード等の再利用パターン
  const reusablePatterns = [
    /button/i,
    /btn/i,
    /card/i,
    /item/i,
    /tag/i,
    /badge/i,
    /chip/i
  ];

  return reusablePatterns.some(pattern => pattern.test(node.name));
}

// =====================================
// Export
// =====================================

export default {
  BaseRuleChecker,
  isFrame,
  isComponent,
  hasAutoLayout,
  isSemanticName,
  hasAbsolutePositioning,
  hasFixedSize,
  hasWrapEnabled,
  calculateDepth,
  hasMinWidth,
  hasLayerAbuse,
  shouldBeComponent
};