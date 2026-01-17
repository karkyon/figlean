// =====================================
// ファイルパス: backend/src/controllers/autofixController.ts
// 概要: AutoFix APIコントローラー
// 機能説明: AutoFix関連エンドポイントのハンドリング（ビジネスロジックなし）
// 作成日: 2026-01-17
// 更新日: 2026-01-17
// 更新理由: 新規作成
// 依存関係: Express, autofixサービス群, utils/response, utils/logger
// =====================================

import { Request, Response, NextFunction } from 'express';
import * as autofixPreviewService from '../services/autofix/autofixPreviewService';
import * as autofixExecutorService from '../services/autofix/autofixExecutorService';
import * as autofixHistoryService from '../services/autofix/autofixHistoryService';
import * as autofixConfigService from '../services/autofix/autofixConfigService';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';
import {
  AutoFixPreviewRequestDto,
  AutoFixExecuteRequestDto,
  AutoFixRollbackRequestDto,
  UpdateAutoFixConfigDto,
  AutoFixHistoryListQuery,
} from '../types/autofix';

// =====================================
// 型定義
// =====================================

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    name: string;
  };
}

// =====================================
// プレビュー生成
// =====================================

/**
 * POST /api/autofix/:projectId/preview
 * AutoFix修正内容のプレビュー生成
 */
export async function generatePreview(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const requestBody: AutoFixPreviewRequestDto = req.body;

    logger.info('AutoFixプレビュー要求', { projectId, userId, body: requestBody });

    const preview = await autofixPreviewService.generatePreview(
      projectId,
      userId,
      requestBody
    );

    sendSuccess(res, preview, 'AutoFix修正プレビューを生成しました', 200, req.id);
  } catch (error: any) {
    logger.error('AutoFixプレビュー生成エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// AutoFix実行
// =====================================

/**
 * POST /api/autofix/:projectId/execute
 * AutoFix修正実行
 */
export async function executeAutoFix(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const requestBody: AutoFixExecuteRequestDto = req.body;

    logger.info('AutoFix実行要求', { projectId, userId, body: requestBody });

    const result = await autofixExecutorService.executeAutoFix(
      projectId,
      userId,
      requestBody
    );

    sendSuccess(res, result, 'AutoFix修正を実行しました', 200, req.id);
  } catch (error: any) {
    logger.error('AutoFix実行エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// 個別修正実行
// =====================================

/**
 * POST /api/autofix/:projectId/execute/individual
 * 個別違反の修正実行
 */
export async function executeIndividualFix(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { violationId, deleteComment } = req.body;

    logger.info('AutoFix個別実行要求', { projectId, userId, violationId });

    const result = await autofixExecutorService.executeAutoFix(projectId, userId, {
      violationIds: [violationId],
      deleteComments: deleteComment || false,
    });

    sendSuccess(res, result, '個別修正を実行しました', 200, req.id);
  } catch (error: any) {
    logger.error('AutoFix個別実行エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// 履歴取得
// =====================================

/**
 * GET /api/autofix/:projectId/history
 * AutoFix実行履歴取得
 */
export async function getHistories(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const query: AutoFixHistoryListQuery = {
      projectId,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      status: req.query.status as any,
    };

    logger.info('AutoFix履歴取得要求', { projectId, userId, query });

    const histories = await autofixHistoryService.getAutoFixHistories(userId, query);

    sendSuccess(res, histories, 'AutoFix履歴を取得しました', 200, req.id);
  } catch (error: any) {
    logger.error('AutoFix履歴取得エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * GET /api/autofix/history/:historyId
 * AutoFix履歴詳細取得
 */
export async function getHistoryDetail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { historyId } = req.params;
    const userId = req.user.userId;

    logger.info('AutoFix履歴詳細取得要求', { historyId, userId });

    const history = await autofixHistoryService.getAutoFixHistoryDetail(
      historyId,
      userId
    );

    sendSuccess(res, history, 'AutoFix履歴詳細を取得しました', 200, req.id);
  } catch (error: any) {
    logger.error('AutoFix履歴詳細取得エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// Rollback実行
// =====================================

/**
 * POST /api/autofix/rollback
 * AutoFix修正のロールバック
 */
export async function rollbackAutoFix(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.userId;
    const requestBody: AutoFixRollbackRequestDto = req.body;

    logger.info('AutoFix Rollback要求', { userId, body: requestBody });

    const result = await autofixHistoryService.rollbackAutoFix(userId, requestBody);

    sendSuccess(res, result, 'AutoFix修正をロールバックしました', 200, req.id);
  } catch (error: any) {
    logger.error('AutoFix Rollback エラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// 設定取得・更新
// =====================================

/**
 * GET /api/autofix/config
 * AutoFix設定取得
 */
export async function getConfig(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.userId;

    logger.info('AutoFix設定取得要求', { userId });

    const config = await autofixConfigService.getAutoFixConfig(userId);

    sendSuccess(res, config, 'AutoFix設定を取得しました', 200, req.id);
  } catch (error: any) {
    logger.error('AutoFix設定取得エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * PUT /api/autofix/config
 * AutoFix設定更新
 */
export async function updateConfig(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.userId;
    const updateDto: UpdateAutoFixConfigDto = req.body;

    logger.info('AutoFix設定更新要求', { userId, body: updateDto });

    const config = await autofixConfigService.updateAutoFixConfig(userId, updateDto);

    sendSuccess(res, config, 'AutoFix設定を更新しました', 200, req.id);
  } catch (error: any) {
    logger.error('AutoFix設定更新エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * POST /api/autofix/config/reset
 * AutoFix設定リセット
 */
export async function resetConfig(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.userId;

    logger.info('AutoFix設定リセット要求', { userId });

    const config = await autofixConfigService.resetAutoFixConfig(userId);

    sendSuccess(res, config, 'AutoFix設定をリセットしました', 200, req.id);
  } catch (error: any) {
    logger.error('AutoFix設定リセットエラー', { error, requestId: req.id });
    next(error);
  }
}