// =====================================
// ファイルパス: backend/src/controllers/autofixController.ts
// 概要: AutoFix APIコントローラー
// 機能説明: AutoFix関連エンドポイントのハンドリング（ビジネスロジックなし）
// 作成日: 2026-01-17
// 更新日: 2026-01-17 - 引数順序修正（Service層の定義に合わせてuserId, projectIdの順に統一）
// 更新理由: TypeScriptエラー完全修正、他コントローラーと設計統一
// 依存関係: Express, autofixサービス群, utils/logger, errors
// =====================================

import { Request, Response, NextFunction } from 'express';
import * as autofixPreviewService from '../services/autofix/autofixPreviewService';
import * as autofixExecutorService from '../services/autofix/autofixExecutorService';
import * as autofixHistoryService from '../services/autofix/autofixHistoryService';
import * as autofixConfigService from '../services/autofix/autofixConfigService';
import logger from '../utils/logger';
import { ValidationError } from '../errors';
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

// =====================================
// ユーザー認証チェックヘルパー
// =====================================

function getUserId(req: Request): string {
  if (!req.user || !req.user.userId) {
    throw new ValidationError('認証が必要です');
  }
  return req.user.userId;
}

// =====================================
// プレビュー生成
// =====================================

/**
 * POST /api/autofix/:projectId/preview
 * AutoFix修正内容のプレビュー生成
 */
export async function generatePreview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = getUserId(req);
    const requestBody: AutoFixPreviewRequestDto = req.body;

    if (!projectId) {
      throw new ValidationError('projectIdは必須です');
    }

    if (!requestBody.violationIds || requestBody.violationIds.length === 0) {
      throw new ValidationError('violationIdsは必須です');
    }

    logger.info('AutoFixプレビュー要求', { projectId, userId, violationCount: requestBody.violationIds.length });

    const preview = await autofixPreviewService.generatePreview(
      projectId,
      userId,
      requestBody
    );

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = getUserId(req);
    const requestBody: AutoFixExecuteRequestDto = req.body;

    if (!projectId) {
      throw new ValidationError('projectIdは必須です');
    }

    if (!requestBody.violationIds || requestBody.violationIds.length === 0) {
      throw new ValidationError('violationIdsは必須です');
    }

    logger.info('AutoFix実行要求', { projectId, userId, violationCount: requestBody.violationIds.length });

    const result = await autofixExecutorService.executeAutoFix(
      userId,
      projectId,
      requestBody
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = getUserId(req);
    const { violationId, deleteComment } = req.body;

    if (!projectId) {
      throw new ValidationError('projectIdは必須です');
    }

    if (!violationId) {
      throw new ValidationError('violationIdは必須です');
    }

    logger.info('AutoFix個別実行要求', { projectId, userId, violationId });

    const result = await autofixExecutorService.executeAutoFix(userId, projectId, {
      violationIds: [violationId],
      deleteComments: deleteComment || false,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = getUserId(req);

    if (!projectId) {
      throw new ValidationError('projectIdは必須です');
    }

    const query: AutoFixHistoryListQuery = {
      projectId,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      status: req.query.status as any,
    };

    logger.info('AutoFix履歴取得要求', { projectId, userId, query });

    const histories = await autofixHistoryService.getAutoFixHistories(userId, query);

    res.json({
      success: true,
      data: histories
    });
  } catch (error) {
    logger.error('AutoFix履歴取得エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * GET /api/autofix/history/:historyId
 * AutoFix履歴詳細取得
 */
export async function getHistoryDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { historyId } = req.params;
    const userId = getUserId(req);

    if (!historyId) {
      throw new ValidationError('historyIdは必須です');
    }

    logger.info('AutoFix履歴詳細取得要求', { historyId, userId });

    const history = await autofixHistoryService.getAutoFixHistoryDetail(
      historyId,
      userId
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const requestBody: AutoFixRollbackRequestDto = req.body;

    if (!requestBody.historyIds || requestBody.historyIds.length === 0) {
      throw new ValidationError('historyIdsは必須です');
    }

    logger.info('AutoFix Rollback要求', { userId, historyCount: requestBody.historyIds.length });

    const result = await autofixHistoryService.rollbackAutoFix(userId, requestBody);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);

    logger.info('AutoFix設定取得要求', { userId });

    const config = await autofixConfigService.getAutoFixConfig(userId);

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('AutoFix設定取得エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * PUT /api/autofix/config
 * AutoFix設定更新
 */
export async function updateConfig(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);
    const updateDto: UpdateAutoFixConfigDto = req.body;

    logger.info('AutoFix設定更新要求', { userId, updateKeys: Object.keys(updateDto) });

    const config = await autofixConfigService.updateAutoFixConfig(userId, updateDto);

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('AutoFix設定更新エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * POST /api/autofix/config/reset
 * AutoFix設定リセット
 */
export async function resetConfig(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getUserId(req);

    logger.info('AutoFix設定リセット要求', { userId });

    const config = await autofixConfigService.resetAutoFixConfig(userId);

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('AutoFix設定リセットエラー', { error, requestId: req.id });
    next(error);
  }
}

// =====================================
// エクスポート
// =====================================

export default {
  generatePreview,
  executeAutoFix,
  executeIndividualFix,
  getHistories,
  getHistoryDetail,
  rollbackAutoFix,
  getConfig,
  updateConfig,
  resetConfig
};