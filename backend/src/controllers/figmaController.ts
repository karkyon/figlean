// =====================================
// backend/src/controllers/figmaController.ts
// Figma連携コントローラー - FIGLEAN Phase 6
// 作成日時: 2026年1月11日
// 更新日時: 2026年1月11日 - エラーハンドリング修正
// 依存関係: figmaApiService, Request, Response, NextFunction
// 説明: Figma関連エンドポイントのハンドラー
// =====================================

import { Request, Response, NextFunction } from 'express';
import * as figmaApiService from '../services/figmaApiService';
import * as figmaImportService from '../services/figmaImportService';
import { ValidationError } from '../errors';
import logger from '../utils/logger';

/**
 * GET /api/figma/user
 * Figmaユーザー情報取得
 */
export async function getFigmaUserInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;

    const userInfo = await figmaApiService.getFigmaUser(userId);

    logger.info('Figmaユーザー情報取得成功', { userId });

    res.json({
      success: true,
      data: userInfo
    });
  } catch (error) {
    logger.error('Figmaユーザー情報取得エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * GET /api/figma/files
 * Figmaファイル一覧取得
 */
export async function getFigmaFilesList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;

    const files = await figmaApiService.getFigmaFiles(userId);

    logger.info('Figmaファイル一覧取得成功', { 
      userId, 
      filesCount: files.files.length 
    });

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    logger.error('Figmaファイル一覧取得エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * GET /api/figma/file/:fileKey
 * Figmaファイル詳細取得
 */
export async function getFigmaFileDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { fileKey } = req.params;

    if (!fileKey) {
      throw new ValidationError('fileKeyは必須です');
    }

    // fileKey形式バリデーション（英数字10-50文字）
    const fileKeyRegex = /^[a-zA-Z0-9]{10,50}$/;
    if (!fileKeyRegex.test(fileKey)) {
      throw new ValidationError('fileKeyの形式が不正です');
    }

    const fileDetail = await figmaApiService.getFigmaFile(userId, fileKey);

    logger.info('Figmaファイル詳細取得成功', { 
      userId, 
      fileKey,
      fileName: fileDetail.name
    });

    res.json({
      success: true,
      data: fileDetail
    });
  } catch (error) {
    logger.error('Figmaファイル詳細取得エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * GET /api/figma/file/:fileKey/frames
 * Figmaファイルから全Frame抽出
 */
export async function extractFigmaFrames(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { fileKey } = req.params;
    const { maxDepth, includeHidden } = req.query;

    if (!fileKey) {
      throw new ValidationError('fileKeyは必須です');
    }

    // fileKey形式バリデーション
    const fileKeyRegex = /^[a-zA-Z0-9]{10,50}$/;
    if (!fileKeyRegex.test(fileKey)) {
      throw new ValidationError('fileKeyの形式が不正です');
    }

    // オプション構築
    const options: any = {};
    
    if (maxDepth) {
      const depth = parseInt(maxDepth as string, 10);
      if (isNaN(depth) || depth < 1 || depth > 20) {
        throw new ValidationError('maxDepthは1-20の整数である必要があります');
      }
      options.maxDepth = depth;
    }

    if (includeHidden !== undefined) {
      options.includeHidden = includeHidden === 'true';
    }

    const frames = await figmaApiService.extractFrames(userId, fileKey, options);

    logger.info('Figma Frame抽出成功', { 
      userId, 
      fileKey,
      framesCount: frames.length
    });

    res.json({
      success: true,
      data: {
        fileKey,
        framesCount: frames.length,
        frames
      }
    });
  } catch (error) {
    logger.error('Figma Frame抽出エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * GET /api/figma/file/:fileKey/node/:nodeId
 * 特定ノード情報取得
 */
export async function getFigmaNodeInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { fileKey, nodeId } = req.params;

    if (!fileKey || !nodeId) {
      throw new ValidationError('fileKeyとnodeIdは必須です');
    }

    // fileKey形式バリデーション
    const fileKeyRegex = /^[a-zA-Z0-9]{10,50}$/;
    if (!fileKeyRegex.test(fileKey)) {
      throw new ValidationError('fileKeyの形式が不正です');
    }

    const node = await figmaApiService.getFigmaNode(userId, fileKey, nodeId);

    logger.info('Figmaノード情報取得成功', { 
      userId, 
      fileKey,
      nodeId,
      nodeType: node.type
    });

    res.json({
      success: true,
      data: node
    });
  } catch (error) {
    logger.error('Figmaノード情報取得エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * POST /api/figma/import
 * Figmaインポート＋解析開始（非同期）
 */
export async function startFigmaImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { projectId, fileKey, pageIds, analyzeAll } = req.body;

    // バリデーション
    if (!projectId) {
      throw new ValidationError('projectIdは必須です');
    }

    if (!fileKey) {
      throw new ValidationError('fileKeyは必須です');
    }

    // fileKey形式バリデーション
    const fileKeyRegex = /^[a-zA-Z0-9]{10,50}$/;
    if (!fileKeyRegex.test(fileKey)) {
      throw new ValidationError('fileKeyの形式が不正です');
    }

    // インポート開始
    const result = await figmaImportService.startImport({
      userId,
      projectId,
      fileKey,
      pageIds,
      analyzeAll: analyzeAll !== undefined ? analyzeAll : true
    });

    logger.info('Figmaインポート開始成功', {
      userId,
      projectId,
      jobId: result.jobId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Figmaインポート開始エラー', { error, requestId: req.id });
    next(error);
  }
}

/**
 * GET /api/figma/import/status/:jobId
 * インポート進捗確認
 */
export async function getImportStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      throw new ValidationError('jobIdは必須です');
    }

    const status = await figmaImportService.getImportStatus(jobId);

    logger.info('インポートステータス取得成功', {
      jobId,
      status: status.status
    });

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('インポートステータス取得エラー', { error, requestId: req.id });
    next(error);
  }
}

// エクスポート
export default {
  getFigmaUserInfo,
  getFigmaFilesList,
  getFigmaFileDetail,
  extractFigmaFrames,
  getFigmaNodeInfo,
  startFigmaImport,
  getImportStatus
};