// =====================================
// backend/src/services/suggestionService.ts
// 改善提案サービス - FIGLEAN Phase 8 (UX改善版)
// 作成日時: 2026年1月12日
// 更新日時: 2026年1月12日 - UX改善（データ未生成時のメッセージ）
// 依存関係: lib/prisma, errors, utils/logger
// 説明: 優先度付き改善提案生成・スコア改善シミュレーション
// =====================================

import { PrismaClient, ImprovementSuggestion, RuleViolation } from '@prisma/client';
import { NotFoundError, ValidationError } from '../errors';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// =====================================
// 型定義
// =====================================

/**
 * インパクトレベル
 */
export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * 難易度
 */
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

/**
 * スコア改善シミュレーション
 */
export interface ImprovementSimulation {
  current: number;              // 現在のスコア
  afterHighPriority: number;    // HIGH適用後
  afterAll: number;             // 全提案適用後
}

/**
 * 改善提案レスポンス
 */
export interface SuggestionResponse {
  suggestions: ImprovementSuggestion[];
  improvementSimulation: ImprovementSimulation;
  summary: {
    totalSuggestions: number;
    highPriorityCount: number;
    mediumPriorityCount: number;
    lowPriorityCount: number;
    totalPotentialImprovement: number;
  };
  message?: string; // UX改善: データ未生成時のメッセージ
}

// =====================================
// 改善提案取得
// =====================================

/**
 * プロジェクトの改善提案を取得
 * 
 * @param userId - ユーザーID
 * @param projectId - プロジェクトID
 * @returns 改善提案レスポンス
 */
export async function getSuggestions(
  userId: string,
  projectId: string
): Promise<SuggestionResponse> {
  logger.info('改善提案取得開始', { userId, projectId });

  // プロジェクト所有者チェック
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new NotFoundError(`プロジェクトが見つかりません: ${projectId}`);
  }

  if (project.userId !== userId) {
    throw new ValidationError('このプロジェクトへのアクセス権限がありません');
  }

  // 診断実行済みかチェック
  const analysisResult = await prisma.analysisResult.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  });

  if (!analysisResult) {
    logger.warn('診断未実行 - 改善提案データなし', { userId, projectId });
    return {
      suggestions: [],
      improvementSimulation: {
        current: 0,
        afterHighPriority: 0,
        afterAll: 0
      },
      summary: {
        totalSuggestions: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        lowPriorityCount: 0,
        totalPotentialImprovement: 0
      },
      message: '診断が実行されていません。先にFigmaインポートを実行してください。'
    };
  }

  // 改善提案データ取得
  const suggestions = await prisma.improvementSuggestion.findMany({
    where: { projectId },
    orderBy: { priority: 'asc' }  // 優先度順
  });

  // データが存在しない場合
  if (suggestions.length === 0) {
    logger.info('改善提案データなし（すでに完璧なデザイン）', { userId, projectId });
    return {
      suggestions: [],
      improvementSimulation: {
        current: project.figleanScore || 0,
        afterHighPriority: project.figleanScore || 0,
        afterAll: project.figleanScore || 0
      },
      summary: {
        totalSuggestions: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        lowPriorityCount: 0,
        totalPotentialImprovement: 0
      },
      message: '改善提案はありません。デザインは既に優れています！'
    };
  }

  // スコア改善シミュレーション
  const improvementSimulation = calculateImprovementSimulation(
    project.figleanScore || 0,
    suggestions
  );

  // サマリー集計
  const summary = generateSummary(suggestions);

  logger.info('改善提案取得完了', { 
    userId, 
    projectId,
    totalSuggestions: summary.totalSuggestions
  });

  return {
    suggestions,
    improvementSimulation,
    summary
  };
}

/**
 * スコア改善シミュレーション計算
 * 
 * @param currentScore - 現在のスコア
 * @param suggestions - 改善提案一覧
 * @returns スコア改善シミュレーション
 */
function calculateImprovementSimulation(
  currentScore: number,
  suggestions: ImprovementSuggestion[]
): ImprovementSimulation {
  // HIGH優先度の提案のみ適用した場合
  const highPrioritySuggestions = suggestions.filter(
    s => s.impactLevel === 'HIGH'
  );
  const highPriorityImprovement = highPrioritySuggestions.reduce(
    (sum, s) => sum + s.scoreImprovement,
    0
  );

  // 全提案を適用した場合
  const totalImprovement = suggestions.reduce(
    (sum, s) => sum + s.scoreImprovement,
    0
  );

  return {
    current: currentScore,
    afterHighPriority: Math.min(100, currentScore + highPriorityImprovement),
    afterAll: Math.min(100, currentScore + totalImprovement)
  };
}

/**
 * サマリー生成
 * 
 * @param suggestions - 改善提案一覧
 * @returns サマリー
 */
function generateSummary(suggestions: ImprovementSuggestion[]) {
  return {
    totalSuggestions: suggestions.length,
    highPriorityCount: suggestions.filter(s => s.impactLevel === 'HIGH').length,
    mediumPriorityCount: suggestions.filter(s => s.impactLevel === 'MEDIUM').length,
    lowPriorityCount: suggestions.filter(s => s.impactLevel === 'LOW').length,
    totalPotentialImprovement: suggestions.reduce(
      (sum, s) => sum + s.scoreImprovement,
      0
    )
  };
}

// =====================================
// 改善提案生成
// =====================================

/**
 * 改善提案を生成（診断時に呼び出される）
 * 
 * @param projectId - プロジェクトID
 * @param violations - ルール違反データ
 * @returns 生成した提案数
 */
export async function generateSuggestions(
  projectId: string,
  violations: RuleViolation[]
): Promise<number> {
  logger.info('改善提案生成開始', { projectId, violationCount: violations.length });

  const suggestions: Array<{
    projectId: string;
    priority: number;
    title: string;
    description: string;
    targetFrame: string;
    targetFrameId: string | null;
    impactLevel: ImpactLevel;
    scoreImprovement: number;
    estimatedTime: string;
    difficulty: Difficulty;
    actionSteps: any;
    beforeValue: string;
    afterValue: string;
  }> = [];

  let priority = 1;

  // CRITICAL違反から高優先度提案を生成
  const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
  
  criticalViolations.forEach(violation => {
    if (violation.ruleId === 'AUTO_LAYOUT_REQUIRED') {
      suggestions.push({
        projectId,
        priority: priority++,
        title: `${violation.frameName} に Auto Layout を設定`,
        description: 'Direction: Horizontal / Gap: 24px',
        targetFrame: violation.frameName,
        targetFrameId: violation.frameId,
        impactLevel: 'HIGH',
        scoreImprovement: 8,
        estimatedTime: '5分',
        difficulty: 'EASY',
        actionSteps: JSON.stringify([
          `${violation.frameName}を選択`,
          'Shift + A でAuto Layout適用',
          'Direction: Horizontal',
          'Gap: 24px'
        ]),
        beforeValue: 'No Auto Layout',
        afterValue: 'Auto Layout (Horizontal, Gap: 24px)'
      });
    }

    if (violation.ruleId === 'FIXED_SIZE_DETECTED') {
      suggestions.push({
        projectId,
        priority: priority++,
        title: `${violation.frameName} の Width を Fill に変更`,
        description: '現在: Fixed → 推奨: Fill Container',
        targetFrame: violation.frameName,
        targetFrameId: violation.frameId,
        impactLevel: 'HIGH',
        scoreImprovement: 6,
        estimatedTime: '3分',
        difficulty: 'EASY',
        actionSteps: JSON.stringify([
          `${violation.frameName}を選択`,
          'プロパティパネルで Width を選択',
          'Fill Container を選択'
        ]),
        beforeValue: 'Width: Fixed (480px)',
        afterValue: 'Width: Fill Container'
      });
    }
  });

  // MAJOR違反から中優先度提案を生成
  const majorViolations = violations.filter(v => v.severity === 'MAJOR');
  
  majorViolations.forEach(violation => {
    if (violation.ruleId === 'WRAP_OFF') {
      suggestions.push({
        projectId,
        priority: priority++,
        title: `${violation.frameName} の Wrap を ON に設定`,
        description: 'レスポンシブ対応のため折り返しを有効化',
        targetFrame: violation.frameName,
        targetFrameId: violation.frameId,
        impactLevel: 'MEDIUM',
        scoreImprovement: 4,
        estimatedTime: '2分',
        difficulty: 'EASY',
        actionSteps: JSON.stringify([
          `${violation.frameName}を選択`,
          'Auto Layout Settings を開く',
          'Wrap: ON を選択'
        ]),
        beforeValue: 'Wrap: OFF',
        afterValue: 'Wrap: ON'
      });
    }

    if (violation.ruleId === 'NON_SEMANTIC_NAME') {
      suggestions.push({
        projectId,
        priority: priority++,
        title: `${violation.frameName} をセマンティックな名前にリネーム`,
        description: 'コンポーネント化・管理性向上',
        targetFrame: violation.frameName,
        targetFrameId: violation.frameId,
        impactLevel: 'MEDIUM',
        scoreImprovement: 3,
        estimatedTime: '1分',
        difficulty: 'EASY',
        actionSteps: JSON.stringify([
          `${violation.frameName}を選択`,
          '右クリック → Rename',
          'セマンティックな名前を入力（例: section-hero）'
        ]),
        beforeValue: violation.frameName,
        afterValue: `section-${violation.frameName.toLowerCase()}`
      });
    }
  });

  // MINOR違反から低優先度提案を生成
  const minorViolations = violations.filter(v => v.severity === 'MINOR');
  
  // 最大5件まで
  minorViolations.slice(0, 5).forEach(violation => {
    if (violation.ruleId === 'MIN_WIDTH_MISSING') {
      suggestions.push({
        projectId,
        priority: priority++,
        title: `${violation.frameName} に Min Width を設定`,
        description: 'テキストオーバーフロー防止',
        targetFrame: violation.frameName,
        targetFrameId: violation.frameId,
        impactLevel: 'LOW',
        scoreImprovement: 2,
        estimatedTime: '2分',
        difficulty: 'EASY',
        actionSteps: JSON.stringify([
          `${violation.frameName}を選択`,
          'プロパティパネルで Width を選択',
          'Min Width: 200px を設定'
        ]),
        beforeValue: 'Min Width: 未設定',
        afterValue: 'Min Width: 200px'
      });
    }

    if (violation.ruleId === 'COMPONENT_NOT_USED') {
      suggestions.push({
        projectId,
        priority: priority++,
        title: `${violation.frameName} を Component 化`,
        description: '再利用性・一貫性向上',
        targetFrame: violation.frameName,
        targetFrameId: violation.frameId,
        impactLevel: 'LOW',
        scoreImprovement: 2,
        estimatedTime: '3分',
        difficulty: 'MEDIUM',
        actionSteps: JSON.stringify([
          `${violation.frameName}を選択`,
          'Ctrl/Cmd + Alt + K でComponent作成',
          '名前を設定（例: Button/Primary）'
        ]),
        beforeValue: 'Frame (非Component)',
        afterValue: 'Component'
      });
    }
  });

  // 提案を保存
  if (suggestions.length > 0) {
    await prisma.improvementSuggestion.createMany({
      data: suggestions
    });
  }

  logger.info('改善提案生成完了', { 
    projectId, 
    generatedCount: suggestions.length 
  });

  return suggestions.length;
}

/**
 * 改善提案をクリア（再診断時に呼び出される）
 * 
 * @param projectId - プロジェクトID
 * @returns 削除した件数
 */
export async function clearSuggestions(projectId: string): Promise<number> {
  logger.info('改善提案クリア開始', { projectId });

  const result = await prisma.improvementSuggestion.deleteMany({
    where: { projectId }
  });

  logger.info('改善提案クリア完了', { 
    projectId, 
    deletedCount: result.count 
  });

  return result.count;
}

// =====================================
// エクスポート
// =====================================

export default {
  getSuggestions,
  generateSuggestions,
  clearSuggestions
};