// =====================================
// backend/src/services/predictionService.ts
// 崩壊予測サービス - FIGLEAN Phase 8 (UX改善版)
// 作成日時: 2026年1月12日
// 更新日時: 2026年1月12日 - UX改善（データ未生成時のメッセージ）
// 依存関係: lib/prisma, errors, utils/logger
// 説明: レスポンシブ崩壊予測・ブレークポイント検証
// =====================================

import { PrismaClient, BreakPrediction, Severity } from '@prisma/client';
import { NotFoundError, ValidationError } from '../errors';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// =====================================
// 型定義
// =====================================

/**
 * ブレークポイント種別
 */
export type BreakpointType = 'mobile' | 'tablet' | 'desktop';

/**
 * 崩壊タイプ
 */
export type BreakType = 
  | 'HORIZONTAL_SCROLL'      // 横スクロール発生
  | 'FLEX_WRAP_FAILURE'      // Flex折り返し失敗
  | 'TEXT_OVERFLOW'          // テキストオーバーフロー
  | 'SIZE_MISMATCH'          // サイズ不一致
  | 'HEIGHT_MISMATCH'        // 高さ不一致
  | 'FIXED_WIDTH_ISSUE';     // 固定幅問題

/**
 * レスポンシブ問題サマリー
 */
export interface ResponsiveIssues {
  mobile: {
    width: string;
    issues: string[];
  };
  tablet: {
    width: string;
    issues: string[];
  };
  desktop: {
    width: string;
    issues: string[];
  };
}

/**
 * 崩壊予測レスポンス
 */
export interface PredictionResponse {
  predictions: BreakPrediction[];
  responsiveIssues: ResponsiveIssues;
  summary: {
    totalPredictions: number;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
  };
  message?: string; // UX改善: データ未生成時のメッセージ
}

// =====================================
// ブレークポイント定義
// =====================================

const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1440
} as const;

// =====================================
// 崩壊予測ロジック
// =====================================

/**
 * プロジェクトの崩壊予測を取得
 * 
 * @param userId - ユーザーID
 * @param projectId - プロジェクトID
 * @returns 崩壊予測レスポンス
 */
export async function getPredictions(
  userId: string,
  projectId: string
): Promise<PredictionResponse> {
  logger.info('崩壊予測取得開始', { userId, projectId });

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
    logger.warn('診断未実行 - 崩壊予測データなし', { userId, projectId });
    return {
      predictions: [],
      responsiveIssues: {
        mobile: { width: '375px', issues: [] },
        tablet: { width: '768px', issues: [] },
        desktop: { width: '1440px', issues: [] }
      },
      summary: {
        totalPredictions: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0
      },
      message: '診断が実行されていません。先にFigmaインポートを実行してください。'
    };
  }

  // 崩壊予測データ取得
  const predictions = await prisma.breakPrediction.findMany({
    where: { projectId },
    orderBy: [
      { severity: 'asc' },    // CRITICAL → MAJOR → MINOR
      { createdAt: 'desc' }
    ]
  });

  // データが存在しない場合
  if (predictions.length === 0) {
    logger.info('崩壊予測データなし（ルール違反が軽微）', { userId, projectId });
    return {
      predictions: [],
      responsiveIssues: {
        mobile: { width: '375px', issues: [] },
        tablet: { width: '768px', issues: [] },
        desktop: { width: '1440px', issues: [] }
      },
      summary: {
        totalPredictions: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0
      },
      message: 'レスポンシブ崩壊の予測はありません。デザインは良好です！'
    };
  }

  // レスポンシブ問題サマリー生成
  const responsiveIssues = generateResponsiveIssues(predictions);

  // サマリー集計
  const summary = {
    totalPredictions: predictions.length,
    criticalCount: predictions.filter(p => p.severity === 'CRITICAL').length,
    majorCount: predictions.filter(p => p.severity === 'MAJOR').length,
    minorCount: predictions.filter(p => p.severity === 'MINOR').length
  };

  logger.info('崩壊予測取得完了', { 
    userId, 
    projectId,
    totalPredictions: summary.totalPredictions
  });

  return {
    predictions,
    responsiveIssues,
    summary
  };
}

/**
 * レスポンシブ問題サマリー生成
 * 
 * @param predictions - 崩壊予測データ
 * @returns レスポンシブ問題サマリー
 */
function generateResponsiveIssues(
  predictions: BreakPrediction[]
): ResponsiveIssues {
  const issues: ResponsiveIssues = {
    mobile: {
      width: `${BREAKPOINTS.mobile}px`,
      issues: []
    },
    tablet: {
      width: `${BREAKPOINTS.tablet}px`,
      issues: []
    },
    desktop: {
      width: `${BREAKPOINTS.desktop}px`,
      issues: []
    }
  };

  // ブレークポイント別に集計
  predictions.forEach(prediction => {
    const breakpoint = prediction.breakpoint as BreakpointType | null;
    
    if (!breakpoint) return;

    const issueText = generateIssueText(prediction);

    if (breakpoint === 'mobile') {
      issues.mobile.issues.push(issueText);
    } else if (breakpoint === 'tablet') {
      issues.tablet.issues.push(issueText);
    } else if (breakpoint === 'desktop') {
      issues.desktop.issues.push(issueText);
    }
  });

  return issues;
}

/**
 * 問題文言生成
 * 
 * @param prediction - 崩壊予測データ
 * @returns 問題文言
 */
function generateIssueText(prediction: BreakPrediction): string {
  const breakType = prediction.breakType as BreakType;

  switch (breakType) {
    case 'HORIZONTAL_SCROLL':
      return `横スクロール発生 (${prediction.affectedFrame})`;
    
    case 'FLEX_WRAP_FAILURE':
      return `Flex折り返し失敗 (${prediction.affectedFrame})`;
    
    case 'TEXT_OVERFLOW':
      return `テキストオーバーフロー (${prediction.affectedFrame})`;
    
    case 'SIZE_MISMATCH':
    case 'HEIGHT_MISMATCH':
      return `サイズ不一致 (${prediction.affectedFrame})`;
    
    case 'FIXED_WIDTH_ISSUE':
      return `固定幅問題 (${prediction.affectedFrame})`;
    
    default:
      return `レイアウト崩壊 (${prediction.affectedFrame})`;
  }
}

/**
 * 崩壊予測を生成（診断時に呼び出される）
 * 
 * @param projectId - プロジェクトID
 * @param violations - ルール違反データ
 * @returns 生成した予測数
 */
export async function generatePredictions(
  projectId: string,
  violations: any[]
): Promise<number> {
  logger.info('崩壊予測生成開始', { projectId, violationCount: violations.length });

  const predictions: Array<{
    projectId: string;
    breakType: string;
    breakTitle: string;
    breakDescription: string;
    affectedFrame: string;
    affectedFrameId: string | null;
    breakpoint: string | null;
    screenWidth: number | null;
    fixSuggestion: string;
    severity: Severity;
  }> = [];

  // ルール違反から崩壊予測を生成
  violations.forEach(violation => {
    // 固定幅検出 → 横スクロール予測
    if (violation.ruleId === 'FIXED_SIZE_DETECTED' && violation.severity === 'CRITICAL') {
      predictions.push({
        projectId,
        breakType: 'HORIZONTAL_SCROLL',
        breakTitle: 'SP幅で横スクロール発生',
        breakDescription: `${violation.frameName}が固定幅 → Widthをfillに変更`,
        affectedFrame: violation.frameName,
        affectedFrameId: violation.frameId,
        breakpoint: 'mobile',
        screenWidth: BREAKPOINTS.mobile,
        fixSuggestion: 'Width を Fill Container に変更してください',
        severity: 'CRITICAL'
      });
    }

    // Wrap: OFF検出 → Flex折り返し失敗予測
    if (violation.ruleId === 'WRAP_OFF' && violation.severity === 'MAJOR') {
      predictions.push({
        projectId,
        breakType: 'FLEX_WRAP_FAILURE',
        breakTitle: 'Flex折り返しが機能しません',
        breakDescription: `${violation.frameName}でWrap: OFF → WrapをONに変更`,
        affectedFrame: violation.frameName,
        affectedFrameId: violation.frameId,
        breakpoint: 'tablet',
        screenWidth: BREAKPOINTS.tablet,
        fixSuggestion: 'Auto Layout Settings → Wrap: ON',
        severity: 'MAJOR'
      });
    }

    // Min Width未設定 → テキストオーバーフロー予測
    if (violation.ruleId === 'MIN_WIDTH_MISSING' && violation.severity === 'MINOR') {
      predictions.push({
        projectId,
        breakType: 'TEXT_OVERFLOW',
        breakTitle: 'テキストオーバーフロー発生',
        breakDescription: `${violation.frameName}でMin Width未設定 → Min Widthを設定`,
        affectedFrame: violation.frameName,
        affectedFrameId: violation.frameId,
        breakpoint: 'mobile',
        screenWidth: BREAKPOINTS.mobile,
        fixSuggestion: 'Min Width を設定してください（推奨: 200px）',
        severity: 'MINOR'
      });
    }

    // Component未使用 → サイズ不一致予測
    if (violation.ruleId === 'COMPONENT_NOT_USED' && violation.frameName.includes('Button')) {
      predictions.push({
        projectId,
        breakType: 'HEIGHT_MISMATCH',
        breakTitle: 'ボタン高さ不一致',
        breakDescription: `${violation.frameName}がComponent未使用 → Component化推奨`,
        affectedFrame: violation.frameName,
        affectedFrameId: violation.frameId,
        breakpoint: null,
        screenWidth: null,
        fixSuggestion: 'ボタンをComponentとして統一してください',
        severity: 'MINOR'
      });
    }
  });

  // 崩壊予測を保存
  if (predictions.length > 0) {
    await prisma.breakPrediction.createMany({
      data: predictions
    });
  }

  logger.info('崩壊予測生成完了', { 
    projectId, 
    generatedCount: predictions.length 
  });

  return predictions.length;
}

/**
 * 崩壊予測をクリア（再診断時に呼び出される）
 * 
 * @param projectId - プロジェクトID
 * @returns 削除した件数
 */
export async function clearPredictions(projectId: string): Promise<number> {
  logger.info('崩壊予測クリア開始', { projectId });

  const result = await prisma.breakPrediction.deleteMany({
    where: { projectId }
  });

  logger.info('崩壊予測クリア完了', { 
    projectId, 
    deletedCount: result.count 
  });

  return result.count;
}

// =====================================
// エクスポート
// =====================================

export default {
  getPredictions,
  generatePredictions,
  clearPredictions
};