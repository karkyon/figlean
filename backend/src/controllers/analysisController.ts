// =====================================
// ファイルパス: backend/src/controllers/analysisController.ts
// 概要: 診断結果コントローラー - ページング対応版
// 機能説明:
//   - プロジェクト診断サマリー取得
//   - ルール違反一覧取得（ページング、フィルター付き）
//   - 崩壊予測一覧取得
//   - 改善提案一覧取得
// 作成日: 2026-01-12
// 更新日: 2026-01-16 - ページング機能追加、コメント投稿済みフィルター追加
// 依存関係:
//   - express
//   - @prisma/client
//   - ../lib/prisma
//   - ../utils/logger
//   - ../errors
// =====================================

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { ValidationError } from '../errors';

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
    userId: req.user?.userId
  });

  try {
    const { projectId } = req.params;
    const userId = req.user!.userId;

    // プロジェクトの所有権確認
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new ValidationError('プロジェクトが見つかりません');
    }

    // 診断結果取得（findFirst に変更）
    const analysis = await prisma.analysisResult.findFirst({
      where: { projectId }
    });

    if (!analysis) {
      logger.info('✅ [CONTROLLER] 診断結果未作成', { projectId });
      res.json({
        success: true,
        data: null
      });
      return;
    }

    // 違反統計を集計
    const violationStats = await prisma.ruleViolation.groupBy({
      by: ['severity'],
      where: { projectId },
      _count: { severity: true }
    });

    const violations = {
      critical: violationStats.find((v: any) => v.severity === 'CRITICAL')?._count.severity || 0,
      major: violationStats.find((v: any) => v.severity === 'MAJOR')?._count.severity || 0,
      minor: violationStats.find((v: any) => v.severity === 'MINOR')?._count.severity || 0
    };

    // フレーム総数
    const totalFrames = await prisma.ruleViolation.groupBy({
      by: ['frameId'],
      where: { projectId }
    }).then((frames: any) => frames.length);

    logger.info('✅ [CONTROLLER] 診断サマリー取得成功', {
      projectId,
      figleanScore: analysis.figleanScore
    });

    res.json({
      success: true,
      data: {
        figleanScore: analysis.figleanScore,
        canGenerateHTML: analysis.htmlGeneratable,
        canUseGrid: analysis.figleanScore === 100,  // 100点の場合のみGrid可能
        violations,
        totalFrames,
        analyzedAt: analysis.createdAt
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] 診断サマリー取得エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// GET /api/analysis/:projectId/violations
// ルール違反一覧取得（ページング対応）
// =====================================

export async function getViolations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  logger.info('🔵 [CONTROLLER] getViolations 開始', {
    projectId: req.params.projectId,
    userId: req.user?.userId,
    query: req.query
  });

  try {
    const { projectId } = req.params;
    const { 
      severity, 
      limit, 
      offset, 
      commentPosted  // 新規: コメント投稿済みフィルター
    } = req.query;
    const userId = req.user!.userId;

    // プロジェクトの所有権確認
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new ValidationError('プロジェクトが見つかりません');
    }

    // ページングパラメータ
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    // フィルター条件構築
    const whereCondition: any = {
      projectId
    };

    // 重要度フィルター
    if (severity) {
      whereCondition.severity = severity as any;
    }

    // コメント投稿済みフィルター
    if (commentPosted !== undefined) {
      whereCondition.commentPosted = commentPosted === 'true';
    }

    // RuleViolation取得
    const violations = await prisma.ruleViolation.findMany({
      where: whereCondition,
      take: limitNum,
      skip: offsetNum,
      orderBy: [
        { severity: 'asc' },  // CRITICAL → MAJOR → MINOR
        { frameName: 'asc' }
      ]
    });

    // 総件数取得
    const total = await prisma.ruleViolation.count({
      where: whereCondition
    });

    logger.info('✅ [CONTROLLER] ルール違反一覧取得成功', {
      projectId,
      count: violations.length,
      total,
      limit: limitNum,
      offset: offsetNum
    });

    res.json({
      success: true,
      data: {
        violations,
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + violations.length < total
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
    const { projectId } = req.params;
    const userId = req.user!.userId;

    // プロジェクトの所有権確認
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new ValidationError('プロジェクトが見つかりません');
    }

    // 崩壊予測取得（テーブル名とカラム名を修正）
    const predictions = await prisma.breakPrediction.findMany({
      where: { projectId },
      orderBy: [
        { severity: 'desc' },  // CRITICAL → MAJOR → MINOR
        { affectedFrame: 'asc' }
      ]
    });

    logger.info('✅ [CONTROLLER] 崩壊予測取得成功', {
      projectId,
      count: predictions.length
    });

    res.json({
      success: true,
      data: {
        predictions
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] 崩壊予測取得エラー', { error, requestId: req.id });
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
    const { projectId } = req.params;
    const userId = req.user!.userId;

    // プロジェクトの所有権確認
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new ValidationError('プロジェクトが見つかりません');
    }

    // 改善提案取得
    const suggestions = await prisma.improvementSuggestion.findMany({
      where: { projectId },
      orderBy: [
        { priority: 'asc' },
        { scoreImprovement: 'desc' }
      ]
    });

    logger.info('✅ [CONTROLLER] 改善提案取得成功', {
      projectId,
      count: suggestions.length
    });

    res.json({
      success: true,
      data: {
        suggestions
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] 改善提案取得エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// エクスポート
// =====================================

export default {
  getAnalysisSummary,
  getViolations,
  getPredictions,
  getSuggestions
};