// =====================================
// ファイルパス: backend/src/controllers/figmaCommentController.ts
// 概要: Figmaコメント投稿コントローラー（薄い層）
// 機能説明:
//   - リクエスト/レスポンス処理のみ
//   - Serviceレイヤーへの委譲
//   - エラーハンドリング
// 作成日: 2026-01-12
// 更新日: 2026-01-16 - MVC/三層アーキテクチャ準拠に修正（Service分離）
// 依存関係:
//   - express
//   - ../services/figmaCommentService
//   - ../utils/logger
//   - ../errors
// =====================================

import { Request, Response, NextFunction } from 'express';
import { Severity } from '@prisma/client';
import * as figmaCommentService from '../services/figmaCommentService';
import logger from '../utils/logger';

// =====================================
// POST /api/figma/comments/:projectId/:violationId
// 単一ルール違反へのコメント投稿
// =====================================

export async function postCommentToViolation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId, violationId } = req.params;
    const { includeFixSteps, includeDetectedValue, language } = req.body;

    logger.info('🔵 [CONTROLLER] postCommentToViolation', {
      userId,
      projectId,
      violationId
    });

    const result = await figmaCommentService.postCommentForViolation(
      userId,
      violationId,
      {
        includeFixSteps,
        includeDetectedValue,
        language
      }
    );

    // 投稿失敗時はエラーレスポンス
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'COMMENT_POST_FAILED',
          message: result.error || 'コメント投稿に失敗しました'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] postCommentToViolation エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// POST /api/figma/comments/:projectId
// プロジェクト全体への一括コメント投稿
// =====================================

export async function postCommentsToProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;
    const {
      includeFixSteps,
      includeDetectedValue,
      language,
      minSeverity
    } = req.body;

    logger.info('🔵 [CONTROLLER] postCommentsToProject', {
      userId,
      projectId,
      minSeverity
    });

    const options = {
      includeFixSteps,
      includeDetectedValue,
      language
    };

    let result;

    // 重要度フィルタがある場合
    if (minSeverity) {
      result = await figmaCommentService.postCommentsBySeverity(
        userId,
        projectId,
        minSeverity as Severity,
        options
      );
    } else {
      // 全ルール違反に投稿
      result = await figmaCommentService.postCommentsForProject(
        userId,
        projectId,
        options
      );
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] postCommentsToProject エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// GET /api/figma/comments/:projectId
// 投稿済みコメント一覧取得
// =====================================

export async function getPostedComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    logger.info('🔵 [CONTROLLER] getPostedComments', { userId, projectId });

    const violations = await figmaCommentService.getPostedComments(
      userId,
      projectId
    );

    res.json({
      success: true,
      data: {
        projectId,
        count: violations.length,
        violations
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] getPostedComments エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// DELETE /api/figma/comments/:projectId/:violationId
// 特定のルール違反のコメント削除
// =====================================

export async function deleteCommentFromViolation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId, violationId } = req.params;

    logger.info('🔵 [CONTROLLER] deleteCommentFromViolation', {
      userId,
      projectId,
      violationId
    });

    await figmaCommentService.deleteCommentForViolation(
      userId,
      projectId,
      violationId
    );

    res.json({
      success: true,
      data: {
        message: 'コメントを削除しました',
        violationId
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] deleteCommentFromViolation エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// DELETE /api/figma/comments/:projectId
// プロジェクト内のコメントフラグをリセット
// =====================================

export async function resetProjectComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    logger.info('🔵 [CONTROLLER] resetProjectComments', { userId, projectId });

    const resetCount = await figmaCommentService.resetCommentFlags(
      userId,
      projectId
    );

    res.json({
      success: true,
      data: {
        message: 'コメントフラグをリセットしました',
        projectId,
        resetCount
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] resetProjectComments エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// GET /api/figma/comments/:projectId/:violationId/preview
// コメントメッセージのプレビュー生成
// =====================================

export async function previewCommentMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId, violationId } = req.params;
    const { includeFixSteps, includeDetectedValue, language } = req.query;

    logger.info('🔵 [CONTROLLER] previewCommentMessage', {
      userId,
      projectId,
      violationId
    });

    const result = await figmaCommentService.generateCommentPreview(
      userId,
      violationId,
      {
        includeFixSteps: includeFixSteps === 'true',
        includeDetectedValue: includeDetectedValue === 'true',
        language: (language as 'ja' | 'en') || 'ja'
      }
    );

    res.json({
      success: true,
      data: {
        violationId,
        message: result.message,
        options: result.options
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] previewCommentMessage エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// エクスポート
// =====================================

export default {
  postCommentToViolation,
  postCommentsToProject,
  getPostedComments,
  deleteCommentFromViolation,
  resetProjectComments,
  previewCommentMessage
};