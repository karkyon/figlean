// =====================================
// backend/src/controllers/figmaCommentController.ts
// Figmaコメント投稿コントローラー - FIGLEAN Phase 7
// 作成日時: 2026年1月12日
// 依存関係: figmaCommentService, Request, Response, NextFunction
// 説明: Figmaコメント投稿関連エンドポイントのハンドラー
// =====================================

import { Request, Response, NextFunction } from 'express';
import { Severity } from '@prisma/client';
import * as figmaCommentService from '../services/figmaCommentService';
import { ValidationError } from '../errors';
import logger from '../utils/logger';

// =====================================
// 単一ルール違反へのコメント投稿
// =====================================

/**
 * POST /api/figma/comments/:projectId/:violationId
 * 特定のルール違反にコメント投稿
 */
export async function postCommentToViolation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId, violationId } = req.params;
    const { includeFixSteps, includeDetectedValue, language } = req.body;

    // バリデーション
    if (!violationId) {
      throw new ValidationError('violationIdは必須です');
    }

    // コメント投稿オプション
    const options = {
      includeFixSteps: includeFixSteps !== undefined ? includeFixSteps : true,
      includeDetectedValue: includeDetectedValue !== undefined ? includeDetectedValue : true,
      language: language || 'ja'
    };

    // コメント投稿
    const result = await figmaCommentService.postCommentForViolation(
      userId,
      violationId,
      options
    );

    // ★★★ 修正箇所：投稿失敗時はエラーを返す ★★★
    if (!result.success) {
      logger.error('ルール違反コメント投稿失敗', {
        userId,
        projectId,
        violationId,
        error: result.error
      });

      // result.errorがstring型の場合とオブジェクト型の場合を考慮
      const errorMessage = typeof result.error === 'string' 
        ? result.error 
        : (result.error as any)?.message || 'コメント投稿に失敗しました';

      const errorCode = typeof result.error === 'object' && result.error !== null
        ? (result.error as any)?.code || 'COMMENT_POST_FAILED'
        : 'COMMENT_POST_FAILED';

      res.status(400).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage
        }
      });
      return;
    }

    logger.info('ルール違反コメント投稿API成功', {
      userId,
      projectId,
      violationId,
      success: result.success
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('ルール違反コメント投稿APIエラー', { 
      error, 
      requestId: req.id 
    });
    next(error);
  }
}

// =====================================
// プロジェクト全体への一括コメント投稿
// =====================================

/**
 * POST /api/figma/comments/:projectId
 * プロジェクト内の全ルール違反にコメント一括投稿
 */
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

    // バリデーション
    if (!projectId) {
      throw new ValidationError('projectIdは必須です');
    }

    // コメント投稿オプション
    const options = {
      includeFixSteps: includeFixSteps !== undefined ? includeFixSteps : true,
      includeDetectedValue: includeDetectedValue !== undefined ? includeDetectedValue : true,
      language: language || 'ja'
    };

    let result;

    // 重要度フィルタがある場合
    if (minSeverity) {
      // Severity型のバリデーション
      const validSeverities: Severity[] = ['CRITICAL', 'MAJOR', 'MINOR'];
      if (!validSeverities.includes(minSeverity as Severity)) {
        throw new ValidationError(
          'minSeverityは CRITICAL, MAJOR, MINOR のいずれかである必要があります'
        );
      }

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

    logger.info('プロジェクト一括コメント投稿API成功', {
      userId,
      projectId,
      minSeverity,
      totalViolations: result.totalViolations,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('プロジェクト一括コメント投稿APIエラー', { 
      error, 
      requestId: req.id 
    });
    next(error);
  }
}

// =====================================
// 投稿済みコメント管理
// =====================================

/**
 * GET /api/figma/comments/:projectId
 * 投稿済みコメント一覧取得
 */
export async function getPostedComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    // バリデーション
    if (!projectId) {
      throw new ValidationError('projectIdは必須です');
    }

    // 投稿済みコメント取得
    const violations = await figmaCommentService.getPostedComments(
      userId,
      projectId
    );

    logger.info('投稿済みコメント取得API成功', {
      userId,
      projectId,
      count: violations.length
    });

    res.json({
      success: true,
      data: {
        projectId,
        count: violations.length,
        violations
      }
    });
  } catch (error) {
    logger.error('投稿済みコメント取得APIエラー', { 
      error, 
      requestId: req.id 
    });
    next(error);
  }
}

/**
 * DELETE /api/figma/comments/:projectId/:violationId
 * 特定のルール違反のコメント削除
 */
export async function deleteCommentFromViolation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId, violationId } = req.params;

    // バリデーション
    if (!violationId) {
      throw new ValidationError('violationIdは必須です');
    }

    // ルール違反を取得してコメントIDとfileKeyを確認
    const violation = await figmaCommentService.getPostedComments(
      userId,
      projectId
    );

    const targetViolation = violation.find(v => v.id === violationId);

    if (!targetViolation) {
      throw new ValidationError('指定されたルール違反が見つかりません');
    }

    if (!targetViolation.commentPosted || !targetViolation.figmaCommentId) {
      throw new ValidationError('このルール違反にはコメントが投稿されていません');
    }

    // プロジェクト情報を取得
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new ValidationError('プロジェクトが見つかりません');
    }

    // Figmaからコメント削除
    await figmaCommentService.deleteCommentFromFigma(
      userId,
      project.figmaFileKey,
      targetViolation.figmaCommentId
    );

    // データベース更新
    await prisma.ruleViolation.update({
      where: { id: violationId },
      data: {
        commentPosted: false,
        figmaCommentId: null
      }
    });

    await prisma.$disconnect();

    logger.info('コメント削除API成功', {
      userId,
      projectId,
      violationId
    });

    res.json({
      success: true,
      data: {
        message: 'コメントを削除しました',
        violationId
      }
    });
  } catch (error) {
    logger.error('コメント削除APIエラー', { 
      error, 
      requestId: req.id 
    });
    next(error);
  }
}

/**
 * DELETE /api/figma/comments/:projectId
 * プロジェクト内のコメントフラグをリセット
 */
export async function resetProjectComments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId } = req.params;

    // バリデーション
    if (!projectId) {
      throw new ValidationError('projectIdは必須です');
    }

    // コメントフラグリセット
    const resetCount = await figmaCommentService.resetCommentFlags(
      userId,
      projectId
    );

    logger.info('コメントフラグリセットAPI成功', {
      userId,
      projectId,
      resetCount
    });

    res.json({
      success: true,
      data: {
        message: 'コメントフラグをリセットしました',
        projectId,
        resetCount
      }
    });
  } catch (error) {
    logger.error('コメントフラグリセットAPIエラー', { 
      error, 
      requestId: req.id 
    });
    next(error);
  }
}

// =====================================
// コメントメッセージプレビュー
// =====================================

/**
 * GET /api/figma/comments/:projectId/:violationId/preview
 * コメントメッセージのプレビュー生成
 */
export async function previewCommentMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId, violationId } = req.params;
    const { includeFixSteps, includeDetectedValue, language } = req.query;

    // バリデーション
    if (!violationId) {
      throw new ValidationError('violationIdは必須です');
    }

    // ルール違反を取得
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const violation = await prisma.ruleViolation.findUnique({
      where: { id: violationId },
      include: {
        project: true
      }
    });

    if (!violation) {
      throw new ValidationError('ルール違反が見つかりません');
    }

    // プロジェクト所有者チェック
    if (violation.project.userId !== userId) {
      throw new ValidationError('このプロジェクトへのアクセス権限がありません');
    }

    // コメントメッセージ生成
    const options = {
      includeFixSteps: includeFixSteps === 'true',
      includeDetectedValue: includeDetectedValue === 'true',
      language: (language as 'ja' | 'en') || 'ja'
    };

    const message = figmaCommentService.generateCommentMessage(
      violation,
      options
    );

    await prisma.$disconnect();

    logger.info('コメントプレビュー生成API成功', {
      userId,
      projectId,
      violationId
    });

    res.json({
      success: true,
      data: {
        violationId,
        message,
        options
      }
    });
  } catch (error) {
    logger.error('コメントプレビュー生成APIエラー', { 
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