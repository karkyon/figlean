// =====================================
// backend/src/controllers/analysisController.ts
// 診断結果コントローラー - FIGLEAN Phase 6.6
// 作成日時: 2026年1月11日
// 更新日時: 2026年1月14日 - Named Export対応+徹底ログ追加
// 依存関係: @prisma/client, NextFunction
// 説明: 診断結果取得APIエンドポイント
// =====================================

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';
import { PrismaClient } from '@prisma/client';
import * as predictionService from '../services/predictionService';
import * as suggestionService from '../services/suggestionService';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// =====================================
// GET /api/analysis/:projectId
// 診断サマリー取得
// =====================================

export async function getAnalysisSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('🔵 [CONTROLLER] getAnalysisSummary 開始', {
    projectId: req.params.projectId,
    userId: req.user?.userId,
    headers: req.headers
  });

  try {
    const { projectId } = req.params;
    const userId = req.user!.userId;

    if (!projectId) {
      throw new ValidationError('projectIdは必須です');
    }

    logger.info('🔍 [CONTROLLER] プロジェクト検索', { projectId, userId });

    // プロジェクトの所有権確認
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId }
    });

    if (!project) {
      logger.warn('⚠️ [CONTROLLER] プロジェクトなし', { projectId, userId });
      throw new ValidationError('プロジェクトが見つかりません');
    }

    logger.info('✅ [CONTROLLER] プロジェクト確認OK', { projectId });

    // 解析結果を取得（findFirstを使用 - @uniqueがないため）
    const analysisResult = await prisma.analysisResult.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' }  // 最新の結果を取得
    });

    if (!analysisResult) {
      logger.warn('⚠️ [CONTROLLER] 解析結果なし', { projectId });
      throw new ValidationError('診断結果がありません。先にFigmaインポートを実行してください');
    }

    logger.info('✅ [CONTROLLER] 解析結果取得成功', { 
      projectId, 
      score: analysisResult.figleanScore 
    });

    res.json({
      success: true,
      data: {
        figleanScore: analysisResult.figleanScore,
        layoutScore: analysisResult.layoutScore,
        componentScore: analysisResult.componentScore,
        responsiveScore: analysisResult.responsiveScore,
        semanticScore: analysisResult.semanticScore,
        canGenerateHTML: analysisResult.htmlGeneratable,
        canUseGrid: false, // TODO: Grid生成可能判定実装
        violations: {
          critical: analysisResult.criticalViolations,
          major: analysisResult.majorViolations,
          minor: analysisResult.minorViolations
        },
        totalFrames: analysisResult.totalFrames,
        analyzedAt: analysisResult.createdAt
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] 診断サマリー取得エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// GET /api/analysis/:projectId/violations
// ルール違反一覧取得
// =====================================

export async function getViolations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('🔵 [CONTROLLER] getViolations 開始', {
    projectId: req.params.projectId,
    userId: req.user?.userId
  });

  try {
    const { projectId } = req.params;
    const { severity, limit } = req.query;
    const userId = req.user!.userId;

    // プロジェクトの所有権確認
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new ValidationError('プロジェクトが見つかりません');
    }

    // RuleViolation取得
    const maxLimit = Math.min(parseInt(limit as string) || 50, 100);
    const violations = await prisma.ruleViolation.findMany({
      where: {
        projectId,
        ...(severity && { severity: severity as any })
      },
      take: maxLimit,
      orderBy: [
        { severity: 'asc' },  // CRITICAL → MAJOR → MINOR
        { frameName: 'asc' }
      ]
    });

    const total = await prisma.ruleViolation.count({
      where: {
        projectId,
        ...(severity && { severity: severity as any })
      }
    });

    logger.info('✅ [CONTROLLER] ルール違反一覧取得成功', {
      projectId,
      count: violations.length,
      total
    });

    res.json({
      success: true,
      data: {
        violations,
        total
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] ルール違反一覧取得エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// GET /api/analysis/:projectId/predictions
// 崩壊予測取得
// =====================================
export async function getPredictions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('🔵 [CONTROLLER] getPredictions 開始', {
    projectId: req.params.projectId,
    userId: req.user?.userId
  });

  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    logger.info('崩壊予測取得API開始', { userId, projectId });

    // 崩壊予測取得
    const result = await predictionService.getPredictions(userId, projectId);

    logger.info('✅ [CONTROLLER] 崩壊予測取得API成功', { 
      userId, 
      projectId,
      totalPredictions: result.summary.totalPredictions
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] 崩壊予測取得APIエラー', { 
      error, 
      requestId: req.id 
    });
    next(error);
  }
}

// =====================================
// GET /api/analysis/:projectId/suggestions
// 改善提案取得
// =====================================
export async function getSuggestions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('🔵 [CONTROLLER] getSuggestions 開始', {
    projectId: req.params.projectId,
    userId: req.user?.userId
  });

  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    logger.info('改善提案取得API開始', { userId, projectId });

    // 改善提案取得
    const result = await suggestionService.getSuggestions(userId, projectId);

    logger.info('✅ [CONTROLLER] 改善提案取得API成功', { 
      userId, 
      projectId,
      totalSuggestions: result.summary.totalSuggestions
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] 改善提案取得APIエラー', { 
      error, 
      requestId: req.id 
    });
    next(error);
  }
}