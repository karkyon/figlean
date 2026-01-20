// ファイルパス: backend/src/controllers/htmlGeneratorController.ts
// 完全版 - 実際のFigmaデータ使用

import { Request, Response, NextFunction } from 'express';
import { getHTMLGeneratorService } from '../services/htmlGeneratorService';
import { prisma } from '../app';

import type { HTMLGeneratorOptions } from '../types/html';
import logger from '../utils/logger';
import { ValidationError } from '../errors';

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

const htmlGeneratorService = getHTMLGeneratorService();

// POST /api/html/generate/:projectId
export async function generateHTMLController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    logger.info('🔵 [CONTROLLER] generateHTMLController', { projectId, userId });

    // オプション抽出
    const options: Partial<HTMLGeneratorOptions> = {
      framework: req.body.framework,
      includeResponsive: req.body.includeResponsive,
      includeGrid: req.body.includeGrid,
      breakpoints: req.body.breakpoints,
      minifyOutput: req.body.minifyOutput,
      includeComments: req.body.includeComments
    };

    // プロジェクト情報取得
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId }
    });

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

    // FIGLEANスコア取得
    const analysisResult = await prisma.analysisResult.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    if (!analysisResult) {
      res.status(400).json({ 
        success: false, 
        error: { 
          code: 'NO_ANALYSIS', 
          message: '診断結果が見つかりません。先に診断を実行してください' 
        }
      });
      return;
    }

    const figleanScore = analysisResult.figleanScore;

    // Figmaデータ取得
    const figmaData = analysisResult.rawFigmaData as any;
    if (!figmaData) {
      throw new Error('Figmaデータが見つかりません');
    }

    // HTML生成実行
    const result = await htmlGeneratorService.generateHTML(
      projectId,
      userId,
      figmaData,
      figleanScore,
      options
    );

    // 生成結果をDBに保存
    await prisma.generatedHtml.create({
      data: {
        id: result.id,
        projectId,
        userId,
        framework: result.framework,
        includeResponsive: result.includeResponsive,
        includeGrid: result.includeGrid,
        breakpoints: result.breakpoints as any,
        htmlCode: result.htmlCode,
        cssCode: result.cssCode,
        generationStatus: result.generationStatus,
        generationTimeMs: result.generationTimeMs,
        errorMessage: result.errorMessage
      }
    });

    logger.info('✅ [CONTROLLER] HTML生成成功', {
      projectId,
      generatedId: result.id,
      generationTimeMs: result.generationTimeMs
    });

    res.status(201).json({
      success: true,
      data: {
        generatedId: result.id,
        htmlCode: result.htmlCode,
        metadata: result.metadata,
        generationTimeMs: result.generationTimeMs,
        previewUrl: result.previewUrl,
        downloadUrl: result.downloadUrl
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] generateHTMLController エラー', {
      error,
      requestId: (req as any).id
    });

    if (error instanceof ValidationError) {
      const isScoreTooLow = error.message.includes('FIGLEAN') || error.message.includes('スコア');
      
      res.status(400).json({
        success: false,
        error: {
          code: isScoreTooLow ? 'SCORE_TOO_LOW' : 'VALIDATION_ERROR',
          message: error.message
        }
      });
      return;
    }

    next(error);
  }
}

// GET /api/html/:projectId/preview
export async function getHTMLPreviewController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    logger.info('🔵 [CONTROLLER] getHTMLPreviewController', { projectId, userId });

    const generatedHTML = await prisma.generatedHtml.findFirst({
      where: { projectId, userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!generatedHTML) {
      res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NO_HTML_GENERATED', 
          message: '生成されたHTMLが見つかりません' 
        }
      });
      return;
    }

if (!generatedHTML.htmlCode) {
  res.status(404).json({ 
    success: false, 
    error: { code: 'NO_HTML_CODE', message: 'HTMLコードが空です' }
  });
  return;
}
const previewHTML = htmlGeneratorService.generatePreview(generatedHTML.htmlCode);
    res.setHeader('Content-Type', 'text/html');
    res.send(previewHTML);
  } catch (error) {
    logger.error('❌ [CONTROLLER] getHTMLPreviewController エラー', {
      error,
      requestId: (req as any).id
    });
    next(error);
  }
}

// GET /api/html/:projectId/download
export async function downloadHTMLController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    logger.info('🔵 [CONTROLLER] downloadHTMLController', { projectId, userId });

    const generatedHTML = await prisma.generatedHtml.findFirst({
      where: { projectId, userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!generatedHTML) {
      res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NO_HTML_GENERATED', 
          message: '生成されたHTMLが見つかりません' 
        }
      });
      return;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    const projectName = project?.name || 'figlean-project';

    if (!generatedHTML.htmlCode) {
      res.status(404).json({ 
        success: false, 
        error: { code: 'NO_HTML_CODE', message: 'HTMLコードが空です' }
      });
      return;
    }
    const htmlContent = await htmlGeneratorService.generateDownloadZip(
      generatedHTML.htmlCode,
      projectName
    );

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${projectName}.html"`);
    res.send(htmlContent);
  } catch (error) {
    logger.error('❌ [CONTROLLER] downloadHTMLController エラー', {
      error,
      requestId: (req as any).id
    });
    next(error);
  }
}

// GET /api/html/:projectId/history
export async function getHTMLHistoryController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    logger.info('🔵 [CONTROLLER] getHTMLHistoryController', { projectId, userId, limit, offset });

    const history = await prisma.generatedHtml.findMany({
      where: { projectId, userId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.generatedHtml.count({
      where: { projectId, userId }
    });

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] getHTMLHistoryController エラー', {
      error,
      requestId: (req as any).id
    });
    next(error);
  }
}

// DELETE /api/html/:generatedId
export async function deleteGeneratedHTMLController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { generatedId } = req.params;
    const userId = req.user.userId;

    logger.info('🔵 [CONTROLLER] deleteGeneratedHTMLController', { generatedId, userId });

    const deleted = await prisma.generatedHtml.deleteMany({
      where: {
        id: generatedId,
        userId
      }
    });

    if (deleted.count === 0) {
      res.status(404).json({ 
        success: false, 
        error: { 
          code: 'NOT_FOUND', 
          message: '指定されたHTMLが見つかりません' 
        }
      });
      return;
    }

    res.json({
      success: true,
      message: '削除しました'
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] deleteGeneratedHTMLController エラー', {
      error,
      requestId: (req as any).id
    });
    next(error);
  }
}