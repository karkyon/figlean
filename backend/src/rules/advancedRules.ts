// =====================================
// backend/src/rules/advancedRules.ts
// アドバンスドルール実装 6-10 - FIGLEAN Phase 6.4
// 作成日時: 2026年1月11日
// 説明: 応用的な5ルールの実装
// =====================================

import { BaseRuleChecker, hasAutoLayout, hasMinWidth, hasLayerAbuse, shouldBeComponent, isComponent } from './BaseRuleChecker';
import type { RuleCheckResult, RuleCheckContext } from '../types/rules';
import type { FigmaNode } from '../services/figmaApiService';
import { RuleId, RuleCategory, Severity } from '../types/rules';

// =====================================
// Rule 6: DEPTH_TOO_DEEP
// =====================================

/**
 * 階層深度ルール
 * MAJOR: 深すぎる階層はパフォーマンスとメンテナンス性を悪化させる
 */
export class DepthTooDeepRule extends BaseRuleChecker {
  private static readonly MAX_DEPTH = 8;  // 最大階層深度

  constructor() {
    super({
      id: RuleId.DEPTH_TOO_DEEP,
      name: '階層深度制限',
      category: RuleCategory.LAYOUT,
      severity: Severity.MAJOR,
      description: 'Frame階層は8階層以内に抑えてください',
      impactTemplate: '深すぎる階層はHTML/CSSのパフォーマンスを悪化させます',
      scoreImpact: 5
    });
  }

  check(node: FigmaNode, context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプのみチェック
    if (node.type !== 'FRAME') {
      return this.passed();
    }

    // 現在の深度が最大を超えているかチェック
    if (context.depth > DepthTooDeepRule.MAX_DEPTH) {
      const violation = this.createViolation(
        node,
        `Frame "${node.name}" の階層が深すぎます（現在: ${context.depth}階層）`,
        'HTML/CSSのレンダリングパフォーマンスが低下し、メンテナンスが困難になります',
        'フラットな構造に再設計するか、コンポーネント化して階層を整理してください',
        `${context.depth}階層`,
        `${DepthTooDeepRule.MAX_DEPTH}階層以内`
      );
      return this.failed(violation);
    }

    return this.passed();
  }
}

// =====================================
// Rule 7: HUG_FILL_VIOLATION
// =====================================

/**
 * Hug/Fill原則ルール
 * MAJOR: Hug ContentsとFill Containerの使い分けは必須
 */
export class HugFillViolationRule extends BaseRuleChecker {
  constructor() {
    super({
      id: RuleId.HUG_FILL_VIOLATION,
      name: 'Hug/Fill原則',
      category: RuleCategory.SIZE,
      severity: Severity.MAJOR,
      description: 'Hug ContentsとFill Containerを適切に使い分けてください',
      impactTemplate: '不適切なサイズ設定はレイアウト崩れの原因になります',
      scoreImpact: 5
    });
  }

  check(node: FigmaNode, context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプでAuto Layout有りのみチェック
    if (node.type !== 'FRAME' || !hasAutoLayout(node)) {
      return this.passed();
    }

    // 親ノードがある場合のみチェック
    if (!context.parentNode || !hasAutoLayout(context.parentNode)) {
      return this.passed();
    }

    // ルール: 子要素は基本的にFillを使うべき
    // TODO: より詳細な判定ロジック実装
    // 現在は簡易チェック
    const hasChildren = node.children && node.children.length > 0;
    const isHug = node.primaryAxisSizingMode === 'AUTO';
    
    // 子要素がある場合、Hugは推奨されない
    if (hasChildren && isHug && node.children!.length > 3) {
      const violation = this.createViolation(
        node,
        `Frame "${node.name}" は子要素が多いのにHug Contentsを使用しています`,
        'レスポンシブ時にレイアウトが崩れる可能性があります',
        'Fill Containerに変更するか、子要素のサイズ設定を見直してください',
        'Hug Contents',
        'Fill Container'
      );
      return this.failed(violation);
    }

    return this.passed();
  }
}

// =====================================
// Rule 8: MIN_WIDTH_MISSING
// =====================================

/**
 * 最小幅設定ルール
 * MINOR: 最小幅がないとレスポンシブ時に要素が縮みすぎる
 */
export class MinWidthMissingRule extends BaseRuleChecker {
  constructor() {
    super({
      id: RuleId.MIN_WIDTH_MISSING,
      name: '最小幅設定',
      category: RuleCategory.RESPONSIVE,
      severity: Severity.MINOR,
      description: 'レスポンシブ対応のため最小幅を設定してください',
      impactTemplate: '最小幅がないと、モバイル表示時に要素が縮みすぎる可能性があります',
      scoreImpact: 3
    });
  }

  check(node: FigmaNode, _context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプでAuto Layout有りのみチェック
    if (node.type !== 'FRAME' || !hasAutoLayout(node)) {
      return this.passed();
    }

    // ボタンやカードなど、最小幅が重要な要素のみチェック
    const needsMinWidth = /button|btn|card|input|select/i.test(node.name);
    if (!needsMinWidth) {
      return this.passed();
    }

    // 最小幅が設定されているかチェック
    if (!hasMinWidth(node)) {
      const violation = this.createViolation(
        node,
        `Frame "${node.name}" に最小幅が設定されていません`,
        'モバイル表示時に要素が縮みすぎて、ユーザビリティが低下する可能性があります',
        'Min Widthを設定してください（例: ボタンは120px以上推奨）',
        '未設定',
        'Min Width: 120px以上'
      );
      return this.failed(violation);
    }

    return this.passed();
  }
}

// =====================================
// Rule 9: COMPONENT_NOT_USED
// =====================================

/**
 * コンポーネント化推奨ルール
 * MINOR: 繰り返しパターンはコンポーネント化すべき
 */
export class ComponentNotUsedRule extends BaseRuleChecker {
  constructor() {
    super({
      id: RuleId.COMPONENT_NOT_USED,
      name: 'コンポーネント化推奨',
      category: RuleCategory.COMPONENT,
      severity: Severity.MINOR,
      description: '再利用可能なパターンはコンポーネント化してください',
      impactTemplate: 'コンポーネント化しないと、デザインの一貫性とメンテナンス性が低下します',
      scoreImpact: 2
    });
  }

  check(node: FigmaNode, context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプのみチェック
    if (node.type !== 'FRAME') {
      return this.passed();
    }

    // 既にコンポーネントの場合はスキップ
    if (isComponent(node)) {
      return this.passed();
    }

    // コンポーネント化すべきパターンかチェック
    if (shouldBeComponent(node, context)) {
      const violation = this.createViolation(
        node,
        `Frame "${node.name}" はコンポーネント化すべきパターンです`,
        '同じデザインを複数箇所で使用する場合、メンテナンス性が低下します',
        'Create Component（Cmd/Ctrl + Option/Alt + K）でコンポーネント化してください',
        'Frame',
        'Component'
      );
      return this.failed(violation);
    }

    return this.passed();
  }
}

// =====================================
// Rule 10: LAYER_ABUSE
// =====================================

/**
 * レイヤー乱用ルール
 * MAJOR: レイヤーが多すぎるとパフォーマンスとメンテナンス性が悪化
 */
export class LayerAbuseRule extends BaseRuleChecker {
  constructor() {
    super({
      id: RuleId.LAYER_ABUSE,
      name: 'レイヤー整理',
      category: RuleCategory.LAYOUT,
      severity: Severity.MAJOR,
      description: '1つのFrameに50個以上のレイヤーを配置しないでください',
      impactTemplate: 'レイヤーが多すぎるとパフォーマンスが低下し、メンテナンスが困難になります',
      scoreImpact: 5
    });
  }

  check(node: FigmaNode, _context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプのみチェック
    if (node.type !== 'FRAME') {
      return this.passed();
    }

    // レイヤー乱用をチェック
    if (hasLayerAbuse(node)) {
      const childCount = node.children?.length || 0;
      const violation = this.createViolation(
        node,
        `Frame "${node.name}" に${childCount}個のレイヤーがあります`,
        'レイヤーが多すぎると、HTML/CSSのパフォーマンスが低下し、メンテナンスが困難になります',
        'グループ化、コンポーネント化、または構造の見直しを行ってください',
        `${childCount}個のレイヤー`,
        '50個以内'
      );
      return this.failed(violation);
    }

    return this.passed();
  }
}

// =====================================
// Export
// =====================================

export default {
  DepthTooDeepRule,
  HugFillViolationRule,
  MinWidthMissingRule,
  ComponentNotUsedRule,
  LayerAbuseRule
};