// =====================================
// backend/src/rules/ScoreCalculator.ts
// スコア計算エンジン - FIGLEAN Phase 6.5
// 作成日時: 2026年1月11日
// 依存関係: types/rules
// 説明: 違反情報からFIGLEAN適合度スコアを計算
// =====================================

import type {
  RuleViolation,
  ScoreResult,
  CategoryScore,
  AnalysisResultSummary
} from '../types/rules';
import { RuleCategory, Severity } from '../types/rules';
import logger from '../utils/logger';

// =====================================
// Score Calculator
// =====================================

/**
 * スコア計算エンジン
 */
export class ScoreCalculator {
  // 重要度ごとの減点
  private static readonly SEVERITY_PENALTY = {
    [Severity.CRITICAL]: 10,  // 致命的: -10点
    [Severity.MAJOR]: 5,      // 重大: -5点
    [Severity.MINOR]: 2,      // 軽微: -2点
    [Severity.INFO]: 0        // 情報: 減点なし
  };

  // カテゴリごとの重み付け
  private static readonly CATEGORY_WEIGHT = {
    [RuleCategory.LAYOUT]: 0.30,      // 30%
    [RuleCategory.SIZE]: 0.20,        // 20%
    [RuleCategory.RESPONSIVE]: 0.25,  // 25%
    [RuleCategory.SEMANTIC]: 0.10,    // 10%
    [RuleCategory.COMPONENT]: 0.15    // 15%
  };

  // 最大スコア（100点）
  private static readonly MAX_SCORE = 100;

  /**
   * 解析結果サマリーにスコアを計算して付与
   * 
   * @param summary - 解析結果サマリー
   * @returns スコア計算済みサマリー
   */
  calculateScores(summary: AnalysisResultSummary): AnalysisResultSummary {
    logger.info('スコア計算開始', {
      projectId: summary.projectId,
      violationsCount: summary.violations.length
    });

    // カテゴリ別スコアを計算
    const categoryScores = this.calculateCategoryScores(
      summary.violations,
      summary.totalFrames
    );

    // 総合スコアを計算
    const figleanScore = this.calculateOverallScore(categoryScores);

    // HTML生成可否を判定
    const canGenerateHTML = figleanScore >= 90;
    const canUseGrid = figleanScore === 100;

    // スコア結果を構築
    const scoreResult: ScoreResult = {
      figleanScore,
      layoutScore: categoryScores.find(c => c.category === RuleCategory.LAYOUT)?.score || 100,
      componentScore: categoryScores.find(c => c.category === RuleCategory.COMPONENT)?.score || 100,
      responsiveScore: categoryScores.find(c => c.category === RuleCategory.RESPONSIVE)?.score || 100,
      semanticScore: categoryScores.find(c => c.category === RuleCategory.SEMANTIC)?.score || 100,
      violations: summary.scoreResult.violations,  // 既に計算済み
      canGenerateHTML,
      canUseGrid
    };

    logger.info('スコア計算完了', {
      projectId: summary.projectId,
      figleanScore,
      canGenerateHTML,
      canUseGrid
    });

    // サマリーを更新して返す
    return {
      ...summary,
      scoreResult
    };
  }

  /**
   * カテゴリ別スコアを計算
   * 
   * @param violations - 違反配列
   * @param totalFrames - 総Frame数
   * @returns カテゴリ別スコア配列
   */
  private calculateCategoryScores(
    violations: RuleViolation[],
    totalFrames: number
  ): CategoryScore[] {
    const categories = Object.values(RuleCategory);
    const categoryScores: CategoryScore[] = [];

    for (const category of categories) {
      // このカテゴリの違反を抽出
      const categoryViolations = violations.filter(v => v.category === category);

      // 減点を計算
      const totalPenalty = categoryViolations.reduce((sum, violation) => {
        return sum + ScoreCalculator.SEVERITY_PENALTY[violation.severity];
      }, 0);

      // スコアを計算（100点満点から減点）
      // Frame数で正規化（違反が多くてもFrameが多ければ相対的に影響は少ない）
      const normalizedPenalty = totalFrames > 0 
        ? (totalPenalty / totalFrames) * 10  // 10倍してスケール調整
        : totalPenalty;

      const score = Math.max(0, ScoreCalculator.MAX_SCORE - normalizedPenalty);

      categoryScores.push({
        category,
        score: Math.round(score),
        maxScore: ScoreCalculator.MAX_SCORE,
        violations: categoryViolations.length,
        weight: ScoreCalculator.CATEGORY_WEIGHT[category]
      });
    }

    return categoryScores;
  }

  /**
   * 総合スコアを計算（加重平均）
   * 
   * @param categoryScores - カテゴリ別スコア配列
   * @returns 総合スコア（0-100）
   */
  private calculateOverallScore(categoryScores: CategoryScore[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const categoryScore of categoryScores) {
      weightedSum += categoryScore.score * categoryScore.weight;
      totalWeight += categoryScore.weight;
    }

    // 加重平均を計算
    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return Math.round(overallScore);
  }

  /**
   * スコアレベルを文字列で取得
   * 
   * @param score - FIGLEANスコア（0-100）
   * @returns スコアレベル
   */
  getScoreLevel(score: number): string {
    if (score === 100) return '完璧';
    if (score >= 90) return '優秀';
    if (score >= 75) return '良好';
    if (score >= 60) return '改善推奨';
    return '要改善';
  }

  /**
   * スコアに応じたメッセージを取得
   * 
   * @param score - FIGLEANスコア（0-100）
   * @returns メッセージ
   */
  getScoreMessage(score: number): string {
    if (score === 100) {
      return 'FIGLEAN適合度100%！Grid生成が可能です。';
    }
    if (score >= 90) {
      return 'FIGLEAN適合度90%以上。HTML生成が可能です。';
    }
    if (score >= 75) {
      return 'FIGLEAN適合度75%以上。基本的な生成は可能ですが、改善を推奨します。';
    }
    if (score >= 60) {
      return 'FIGLEAN適合度60%以上。HTML生成は可能ですが、多くの改善が必要です。';
    }
    return 'FIGLEAN適合度60%未満。HTML生成の前に設計を改善してください。';
  }

  /**
   * スコアに応じたグレードを取得
   * 
   * @param score - FIGLEANスコア（0-100）
   * @returns グレード（S/A/B/C/D）
   */
  getScoreGrade(score: number): string {
    if (score === 100) return 'S';
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }
}

// =====================================
// Singleton Instance
// =====================================

let scoreCalculatorInstance: ScoreCalculator | null = null;

/**
 * スコア計算エンジンのシングルトンインスタンスを取得
 */
export function getScoreCalculator(): ScoreCalculator {
  if (!scoreCalculatorInstance) {
    scoreCalculatorInstance = new ScoreCalculator();
  }
  return scoreCalculatorInstance;
}

// =====================================
// Export
// =====================================

export default {
  ScoreCalculator,
  getScoreCalculator
};