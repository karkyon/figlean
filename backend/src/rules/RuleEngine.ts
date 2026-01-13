// =====================================
// backend/src/rules/RuleEngine.ts
// ルールエンジン本体 - FIGLEAN Phase 6.4
// 作成日時: 2026年1月11日
// 依存関係: すべてのルールチェッカー
// 説明: 全ルールを統合実行し、解析結果を生成
// =====================================

import type { FigmaNode } from '../services/figmaApiService';
import type {
  RuleChecker,
  RuleCheckContext,
  RuleViolation,
  AnalysisResultSummary
} from '../types/rules';
import logger from '../utils/logger';

// ルールのインポート
import {
  AutoLayoutRequiredRule,
  AbsolutePositioningRule,
  FixedSizeDetectedRule,
  WrapOffRule,
  NonSemanticNameRule
} from './coreRules';

import {
  DepthTooDeepRule,
  HugFillViolationRule,
  MinWidthMissingRule,
  ComponentNotUsedRule,
  LayerAbuseRule
} from './advancedRules';

// =====================================
// Rule Engine
// =====================================

/**
 * ルールエンジン
 * すべてのルールを統合実行
 */
export class RuleEngine {
  private rules: RuleChecker[];

  constructor() {
    // 全ルールを登録
    this.rules = [
      // Core Rules (Priority: HIGH)
      new AutoLayoutRequiredRule(),
      new AbsolutePositioningRule(),
      new FixedSizeDetectedRule(),
      new WrapOffRule(),
      new NonSemanticNameRule(),
      
      // Advanced Rules (Priority: MEDIUM/LOW)
      new DepthTooDeepRule(),
      new HugFillViolationRule(),
      new MinWidthMissingRule(),
      new ComponentNotUsedRule(),
      new LayerAbuseRule()
    ];

    logger.info('ルールエンジン初期化完了', { rulesCount: this.rules.length });
  }

  /**
   * Figmaドキュメント全体を解析
   * 
   * @param rootNode - Figmaドキュメントのルートノード
   * @param projectId - プロジェクトID
   * @returns 解析結果サマリー
   */
  analyzeDocument(rootNode: FigmaNode, projectId: string): AnalysisResultSummary {
    logger.info('ドキュメント解析開始', { projectId, rootNodeId: rootNode.id });

    // 全ノードを収集
    const allNodes = this.collectAllNodes(rootNode);
    const frameNodes = allNodes.filter(node => node.type === 'FRAME');

    logger.info('ノード収集完了', {
      totalNodes: allNodes.length,
      frameNodes: frameNodes.length
    });

    // 全違反を収集
    const violations: RuleViolation[] = [];
    let analyzedFrames = 0;

    // 各Frameに対してルールチェック実行
    for (const node of frameNodes) {
      const context: RuleCheckContext = {
        depth: this.calculateDepth(node, rootNode, allNodes),
        parentNode: this.findParentNode(node, allNodes),
        rootNode,
        allNodes
      };

      const nodeViolations = this.checkNode(node, context);
      violations.push(...nodeViolations);
      analyzedFrames++;

      // 進捗ログ（100フレームごと）
      if (analyzedFrames % 100 === 0) {
        logger.info(`解析進捗: ${analyzedFrames}/${frameNodes.length} frames`);
      }
    }

    logger.info('ルールチェック完了', {
      analyzedFrames,
      totalViolations: violations.length
    });

    // 統計情報を計算
    const stats = this.calculateStats(allNodes);

    // 結果サマリーを生成
    const summary: AnalysisResultSummary = {
      projectId,
      totalFrames: frameNodes.length,
      analyzedFrames,
      scoreResult: {
        figleanScore: 0,  // ScoreCalculatorで計算
        layoutScore: 0,
        componentScore: 0,
        responsiveScore: 0,
        semanticScore: 0,
        violations: {
          critical: violations.filter(v => v.severity === 'CRITICAL').length,
          major: violations.filter(v => v.severity === 'MAJOR').length,
          minor: violations.filter(v => v.severity === 'MINOR').length,
          info: violations.filter(v => v.severity === 'INFO').length
        },
        canGenerateHTML: false,  // ScoreCalculatorで判定
        canUseGrid: false
      },
      violations,
      stats
    };

    logger.info('解析完了', {
      projectId,
      figleanScore: summary.scoreResult.figleanScore,
      totalViolations: violations.length
    });

    return summary;
  }

  /**
   * 単一ノードに対して全ルールチェック実行
   * 
   * @param node - チェック対象ノード
   * @param context - チェックコンテキスト
   * @returns 違反配列
   */
  private checkNode(node: FigmaNode, context: RuleCheckContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const rule of this.rules) {
      try {
        const result = rule.check(node, context);
        if (!result.passed) {
          violations.push(...result.violations);
        }
      } catch (error) {
        logger.error('ルールチェックエラー', {
          ruleId: rule.getDefinition().id,
          nodeId: node.id,
          nodeName: node.name,
          error
        });
      }
    }

    return violations;
  }

  /**
   * 全ノードを再帰的に収集
   * 
   * @param node - 開始ノード
   * @returns 全ノード配列
   */
  private collectAllNodes(node: FigmaNode): FigmaNode[] {
    const nodes: FigmaNode[] = [node];

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        nodes.push(...this.collectAllNodes(child));
      }
    }

    return nodes;
  }

  /**
   * ノードの階層深度を計算
   * 
   * @param node - 対象ノード
   * @param rootNode - ルートノード
   * @param allNodes - 全ノード配列
   * @returns 階層深度
   */
  private calculateDepth(
    node: FigmaNode,
    rootNode: FigmaNode,
    allNodes: FigmaNode[]
  ): number {
    let depth = 0;
    let current: FigmaNode | undefined = node;

    while (current && current.id !== rootNode.id) {
      depth++;
      current = this.findParentNode(current, allNodes);
      
      // 無限ループ防止
      if (depth > 100) {
        logger.warn('深度計算が100を超えました', { nodeId: node.id });
        break;
      }
    }

    return depth;
  }

  /**
   * 親ノードを検索
   * 
   * @param node - 対象ノード
   * @param allNodes - 全ノード配列
   * @returns 親ノード（見つからない場合はundefined）
   */
  private findParentNode(node: FigmaNode, allNodes: FigmaNode[]): FigmaNode | undefined {
    for (const candidate of allNodes) {
      if (candidate.children && candidate.children.some(child => child.id === node.id)) {
        return candidate;
      }
    }
    return undefined;
  }

  /**
   * 統計情報を計算
   * 
   * @param allNodes - 全ノード配列
   * @returns 統計情報
   */
  private calculateStats(allNodes: FigmaNode[]) {
    const frames = allNodes.filter(node => node.type === 'FRAME');
    const autoLayoutFrames = frames.filter(node => 
      node.layoutMode !== undefined && node.layoutMode !== 'NONE'
    );
    const components = allNodes.filter(node => 
      node.type === 'COMPONENT' || node.type === 'INSTANCE'
    );
    const semanticNames = frames.filter(node => {
      // 簡易セマンティックチェック
      return !/^(Frame|Group|Rectangle|Component)\s+\d+$/i.test(node.name);
    });

    // 平均深度を計算（簡易版）
    const depthSum = frames.reduce((sum, node) => {
      // 子要素数を深度の近似値として使用
      return sum + (node.children?.length || 0);
    }, 0);
    const depthAverage = frames.length > 0 ? depthSum / frames.length : 0;

    return {
      autoLayoutFrames: autoLayoutFrames.length,
      componentUsage: components.length,
      semanticNames: semanticNames.length,
      depthAverage: Math.round(depthAverage * 10) / 10
    };
  }

  /**
   * 登録されているルール数を取得
   */
  getRulesCount(): number {
    return this.rules.length;
  }

  /**
   * 登録されているすべてのルール定義を取得
   */
  getAllRuleDefinitions() {
    return this.rules.map(rule => rule.getDefinition());
  }
}

// =====================================
// Singleton Instance
// =====================================

let ruleEngineInstance: RuleEngine | null = null;

/**
 * ルールエンジンのシングルトンインスタンスを取得
 */
export function getRuleEngine(): RuleEngine {
  if (!ruleEngineInstance) {
    ruleEngineInstance = new RuleEngine();
  }
  return ruleEngineInstance;
}

// =====================================
// Export
// =====================================

export default {
  RuleEngine,
  getRuleEngine
};