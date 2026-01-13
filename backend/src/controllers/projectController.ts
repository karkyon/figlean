// =====================================
// backend/src/controllers/projectController.ts
// プロジェクトコントローラー - FIGLEAN版
// 作成日時: 2026年1月11日 00:12
// 更新日時: 2026年1月11日 - エラーハンドリング修正（NextFunction追加）
// 依存関係: express, services/projectService, types/project, utils/logger
// 説明: プロジェクト管理APIエンドポイント実装、型安全なバリデーション
// =====================================

/**
 * Project Controller
 * プロジェクト管理APIのエンドポイントハンドラー
 */

import { Request, Response, NextFunction } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from '../services/projectService';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectListQuery,
  AnalysisStatus
} from '../types/project';
import logger from '../utils/logger';

/**
 * 認証済みリクエストの型定義
 * authenticateToken middleware が設定する req.user の型
 */
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    name: string;
    plan: 'FREE' | 'PRO' | 'TEAM';
    hasFigmaToken: boolean;
    isActive: boolean;
  };
}

/**
 * GET /api/projects
 * プロジェクト一覧取得
 */
export async function getProjectsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.userId;

    // クエリパラメータ解析
    const query: ProjectListQuery = {
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      sort: (req.query.sort as any) || 'createdAt',
      order: (req.query.order as 'asc' | 'desc') || 'desc',
      status: req.query.status as AnalysisStatus | undefined,
      search: req.query.search as string | undefined
    };

    const result = await getProjects(userId, query);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    logger.error('プロジェクト一覧取得エラー', { error: error as Error, requestId: req.id });
    next(error);
  }
}

/**
 * GET /api/projects/:id
 * プロジェクト詳細取得
 */
export async function getProjectController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await getProjectById(id, userId);

    if (!project) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error: unknown) {
    logger.error('プロジェクト詳細取得エラー', { error: error as Error, requestId: req.id });

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'このプロジェクトにアクセスする権限がありません'
        }
      });
      return;
    }

    next(error);
  }
}

/**
 * POST /api/projects
 * プロジェクト作成
 */
export async function createProjectController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.userId;

    // バリデーション
    const errors: string[] = [];

    if (!req.body.name || req.body.name.trim().length === 0) {
      errors.push('プロジェクト名は必須です');
    } else if (req.body.name.length > 255) {
      errors.push('プロジェクト名は255文字以内で入力してください');
    }

    if (!req.body.figmaFileKey || req.body.figmaFileKey.trim().length === 0) {
      errors.push('FigmaファイルKeyは必須です');
    } else if (!/^[a-zA-Z0-9]{10,50}$/.test(req.body.figmaFileKey)) {
      errors.push('FigmaファイルKeyの形式が不正です');
    }

    if (req.body.figmaFileUrl && !/^https?:\/\/.+/.test(req.body.figmaFileUrl)) {
      errors.push('FigmaファイルURLの形式が不正です');
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
          details: errors
        }
      });
      return;
    }

    const data: CreateProjectDto = {
      name: req.body.name.trim(),
      description: req.body.description?.trim(),
      figmaFileKey: req.body.figmaFileKey.trim(),
      figmaFileUrl: req.body.figmaFileUrl?.trim(),
      figmaFileName: req.body.figmaFileName?.trim(),
      figmaNodeId: req.body.figmaNodeId?.trim()
    };

    const project = await createProject(userId, data);

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error: unknown) {
    logger.error('プロジェクト作成エラー', { error: error as Error, requestId: req.id });

    if (error instanceof Error && error.message === 'PLAN_LIMIT_EXCEEDED') {
      res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: 'プラン上限に達しました。プランをアップグレードしてください'
        }
      });
      return;
    }

    next(error);
  }
}

/**
 * PUT /api/projects/:id
 * プロジェクト更新
 */
export async function updateProjectController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // バリデーション
    const errors: string[] = [];

    if (req.body.name !== undefined) {
      if (req.body.name.trim().length === 0) {
        errors.push('プロジェクト名は必須です');
      } else if (req.body.name.length > 255) {
        errors.push('プロジェクト名は255文字以内で入力してください');
      }
    }

    if (req.body.figmaFileUrl && !/^https?:\/\/.+/.test(req.body.figmaFileUrl)) {
      errors.push('FigmaファイルURLの形式が不正です');
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
          details: errors
        }
      });
      return;
    }

    const data: UpdateProjectDto = {};

    if (req.body.name !== undefined) {
      data.name = req.body.name.trim();
    }
    if (req.body.description !== undefined) {
      data.description = req.body.description?.trim();
    }
    if (req.body.figmaFileUrl !== undefined) {
      data.figmaFileUrl = req.body.figmaFileUrl?.trim();
    }
    if (req.body.figmaFileName !== undefined) {
      data.figmaFileName = req.body.figmaFileName?.trim();
    }
    if (req.body.figmaNodeId !== undefined) {
      data.figmaNodeId = req.body.figmaNodeId?.trim();
    }

    const project = await updateProject(id, userId, data);

    if (!project) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error: unknown) {
    logger.error('プロジェクト更新エラー', { error: error as Error, requestId: req.id });

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'このプロジェクトを更新する権限がありません'
        }
      });
      return;
    }

    next(error);
  }
}

/**
 * DELETE /api/projects/:id
 * プロジェクト削除
 */
export async function deleteProjectController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const deleted = await deleteProject(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'プロジェクトが見つかりません'
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'プロジェクトを削除しました'
    });
  } catch (error: unknown) {
    logger.error('プロジェクト削除エラー', { error: error as Error, requestId: req.id });

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'このプロジェクトを削除する権限がありません'
        }
      });
      return;
    }

    next(error);
  }
}