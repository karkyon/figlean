// =====================================
// backend/src/rules/coreRules.ts
// コアルール実装 1-5 - FIGLEAN Phase 6.4
// 作成日時: 2026年1月11日
// 説明: 最重要5ルールの実装
// =====================================

import { BaseRuleChecker, hasAutoLayout, hasAbsolutePositioning, hasFixedSize, hasWrapEnabled, isSemanticName } from './BaseRuleChecker';
import type { RuleCheckResult, RuleCheckContext } from '../types/rules';
import type { FigmaNode } from '../services/figmaApiService';
import { RuleId, RuleCategory, Severity } from '../types/rules';

// =====================================
// Rule 1: AUTO_LAYOUT_REQUIRED
// =====================================

/**
 * Auto Layout必須ルール
 * CRITICAL: HTML/CSS Flexboxへの変換にAuto Layoutは必須
 */
export class AutoLayoutRequiredRule extends BaseRuleChecker {
  constructor() {
    super({
      id: RuleId.AUTO_LAYOUT_REQUIRED,
      name: 'Auto Layout必須',
      category: RuleCategory.LAYOUT,
      severity: Severity.CRITICAL,
      description: 'FrameにはAuto Layoutを設定する必要があります',
      impactTemplate: 'Auto Layoutなしでは、レスポンシブなHTML/CSSに変換できません',
      scoreImpact: 10
    });
  }

  check(node: FigmaNode, _context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプのみチェック
    if (node.type !== 'FRAME') {
      return this.passed();
    }

    // Auto Layoutが設定されているかチェック
    if (!hasAutoLayout(node)) {
      const violation = this.createViolation(
        node,
        `Frame "${node.name}" にAuto Layoutが設定されていません`,
        'レスポンシブなFlexbox/Gridレイアウトに変換できず、HTML生成が不可能です',
        'Auto Layout設定を追加してください（Shift + A）',
        'NONE',
        'HORIZONTAL または VERTICAL'
      );
      return this.failed(violation);
    }

    return this.passed();
  }
}

// =====================================
// Rule 2: ABSOLUTE_POSITIONING
// =====================================

/**
 * 絶対配置禁止ルール
 * CRITICAL: 絶対配置はレスポンシブ対応が困難
 */
export class AbsolutePositioningRule extends BaseRuleChecker {
  constructor() {
    super({
      id: RuleId.ABSOLUTE_POSITIONING,
      name: '絶対配置禁止',
      category: RuleCategory.LAYOUT,
      severity: Severity.CRITICAL,
      description: '絶対配置（Absolute Positioning）は使用禁止です',
      impactTemplate: '絶対配置では画面サイズに応じた柔軟なレイアウトが実現できません',
      scoreImpact: 10
    });
  }

  check(node: FigmaNode, _context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプのみチェック
    if (node.type !== 'FRAME') {
      return this.passed();
    }

    // 絶対配置が使われているかチェック
    if (hasAbsolutePositioning(node)) {
      const violation = this.createViolation(
        node,
        `Frame "${node.name}" で絶対配置が使用されています`,
        'レスポンシブ対応が困難になり、モバイル表示で崩れる可能性が高いです',
        'Auto Layoutを使用して相対配置に変更してください',
        '絶対配置',
        'Auto Layout (相対配置)'
      );
      return this.failed(violation);
    }

    return this.passed();
  }
}

// =====================================
// Rule 3: FIXED_SIZE_DETECTED
// =====================================

/**
 * 固定サイズ検出ルール
 * MAJOR: 固定サイズはレスポンシブ対応を妨げる
 */
export class FixedSizeDetectedRule extends BaseRuleChecker {
  constructor() {
    super({
      id: RuleId.FIXED_SIZE_DETECTED,
      name: '固定サイズ検出',
      category: RuleCategory.SIZE,
      severity: Severity.MAJOR,
      description: '固定サイズ（Fixed Width/Height）の使用を避けてください',
      impactTemplate: '固定サイズでは画面サイズに応じた柔軟なレイアウトができません',
      scoreImpact: 5
    });
  }

  check(node: FigmaNode, _context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプのみチェック
    if (node.type !== 'FRAME') {
      return this.passed();
    }

    // 固定サイズが使われているかチェック
    if (hasFixedSize(node)) {
      const detectedValue = node.absoluteBoundingBox 
        ? `${Math.round(node.absoluteBoundingBox.width)}px × ${Math.round(node.absoluteBoundingBox.height)}px`
        : 'Fixed';

      const violation = this.createViolation(
        node,
        `Frame "${node.name}" で固定サイズが使用されています`,
        'レスポンシブ対応が制限され、異なる画面サイズで適切に表示されない可能性があります',
        'Hug Contents または Fill Container に変更してください',
        detectedValue,
        'Hug または Fill'
      );
      return this.failed(violation);
    }

    return this.passed();
  }
}

// =====================================
// Rule 4: WRAP_OFF
// =====================================

/**
 * Wrap設定ルール
 * MAJOR: Wrapがないとレスポンシブ時に横スクロールが発生
 */
export class WrapOffRule extends BaseRuleChecker {
  constructor() {
    super({
      id: RuleId.WRAP_OFF,
      name: 'Wrap設定推奨',
      category: RuleCategory.RESPONSIVE,
      severity: Severity.MAJOR,
      description: '複数要素を含むAuto LayoutではWrapを有効にしてください',
      impactTemplate: 'Wrapがないと、モバイル表示時に横スクロールが発生します',
      scoreImpact: 5
    });
  }

  check(node: FigmaNode, _context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプでAuto Layout有りのみチェック
    if (node.type !== 'FRAME' || !hasAutoLayout(node)) {
      return this.passed();
    }

    // 子要素が3つ以上ある場合のみチェック
    if (!node.children || node.children.length < 3) {
      return this.passed();
    }

    // Wrapが有効かチェック
    if (!hasWrapEnabled(node)) {
      const violation = this.createViolation(
        node,
        `Frame "${node.name}" でWrapが無効になっています（子要素: ${node.children.length}個）`,
        'モバイル表示時に要素が折り返されず、横スクロールが発生する可能性があります',
        'Auto Layout設定で "Wrap" を有効にしてください',
        'Wrap: OFF',
        'Wrap: ON'
      );
      return this.failed(violation);
    }

    return this.passed();
  }
}

// =====================================
// Rule 5: NON_SEMANTIC_NAME
// =====================================

/**
 * セマンティック命名ルール
 * MINOR: 命名規則はメンテナンス性とSEOに影響
 */
export class NonSemanticNameRule extends BaseRuleChecker {
  constructor() {
    super({
      id: RuleId.NON_SEMANTIC_NAME,
      name: 'セマンティック命名',
      category: RuleCategory.SEMANTIC,
      severity: Severity.MINOR,
      description: 'Frameには意味のある名前を付けてください',
      impactTemplate: '適切な命名はコードの可読性とSEOに影響します',
      scoreImpact: 2
    });
  }

  check(node: FigmaNode, _context: RuleCheckContext): RuleCheckResult {
    // FRAMEタイプのみチェック
    if (node.type !== 'FRAME') {
      return this.passed();
    }

    // セマンティックな命名かチェック
    if (!isSemanticName(node.name)) {
      const violation = this.createViolation(
        node,
        `Frame "${node.name}" は非セマンティックな名前です`,
        'HTML生成時のclass名やID、アクセシビリティに影響します',
        'header, section-hero, card-product などの意味のある名前に変更してください',
        node.name,
        'section-* / header / nav / card-*'
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
  AutoLayoutRequiredRule,
  AbsolutePositioningRule,
  FixedSizeDetectedRule,
  WrapOffRule,
  NonSemanticNameRule
};