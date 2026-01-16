// =====================================
// ファイルパス: backend/src/controllers/analysisController.ts
// 概要: 診断結果コントローラー（薄い層）
// 機能説明:
//   - リクエスト/レスポンス処理のみ
//   - Serviceレイヤーへの委譲
//   - エラーハンドリング
// 作成日: 2026-01-12
// 更新日: 2026-01-16 - MVC/三層アーキテクチャ準拠に修正（Service分離）
// 依存関係:
//   - express
//   - ../services/analysisService
//   - ../utils/logger
// =====================================

import { Request, Response, NextFunction } from 'express';
import * as analysisService from '../services/analysisService';
import logger from '../utils/logger';

// =====================================
// GET /api/analysis/:projectId
// 診断サマリー取得
// =====================================

export async function getAnalysisSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    logger.info('🔵 [CONTROLLER] getAnalysisSummary', { userId, projectId });

    const summary = await analysisService.fetchAnalysisSummary(userId, projectId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] getAnalysisSummary エラー', { error, requestId: req.id });
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
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;
    const { severity, limit, offset, commentPosted } = req.query;

    logger.info('🔵 [CONTROLLER] getViolations', { userId, projectId, query: req.query });

    const filters = {
      severity: severity as 'CRITICAL' | 'MAJOR' | 'MINOR' | undefined,
      commentPosted: commentPosted === 'true' ? true : commentPosted === 'false' ? false : undefined
    };

    const pagination = {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    };

    const result = await analysisService.fetchViolations(userId, projectId, filters, pagination);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] getViolations エラー', { error, requestId: req.id });
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
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    logger.info('🔵 [CONTROLLER] getPredictions', { userId, projectId });

    const predictions = await analysisService.fetchPredictions(userId, projectId);

    res.json({
      success: true,
      data: { predictions }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] getPredictions エラー', { error, requestId: req.id });
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
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    logger.info('🔵 [CONTROLLER] getSuggestions', { userId, projectId });

    const suggestions = await analysisService.fetchSuggestions(userId, projectId);

    res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] getSuggestions エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// POST /api/analysis/:projectId/reanalyze
// プロジェクト再解析実行
// =====================================

export async function reanalyzeProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    logger.info('🔵 [CONTROLLER] reanalyzeProject', { userId, projectId });

    const result = await analysisService.reanalyzeProject(userId, projectId);

    res.json({
      success: true,
      message: result.message,
      data: {
        jobId: result.jobId,
        status: result.status
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] reanalyzeProject エラー', { error, requestId: req.id });
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
  getSuggestions,
  reanalyzeProject
};