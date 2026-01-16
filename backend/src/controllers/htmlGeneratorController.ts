// =====================================
// ファイルパス: backend/src/controllers/htmlGeneratorController.ts
// 概要: HTML生成コントローラー（薄い層）
// 機能説明:
//   - リクエスト/レスポンス処理のみ
//   - Serviceレイヤーへの委譲
//   - エラーハンドリング
// 作成日: 2026-01-12
// 更新日: 2026-01-16 - MVC/三層アーキテクチャ準拠に修正（Service分離）
// 依存関係:
//   - express
//   - ../services/htmlGeneratorService
//   - ../types/html
//   - ../utils/logger
// =====================================

import { Request, Response, NextFunction } from 'express';
import { getHTMLGeneratorService } from '../services/htmlGeneratorService';
import type { HTMLGeneratorOptions } from '../types/html';
import logger from '../utils/logger';
import { ValidationError } from '../errors';

/**
 * 認証済みリクエストの型定義
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
 * HTML生成サービスのインスタンス
 */
const htmlGeneratorService = getHTMLGeneratorService();

// =====================================
// POST /api/html/generate/:projectId
// HTML生成実行
// =====================================

export async function generateHTMLController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    logger.info('🔵 [CONTROLLER] generateHTMLController', { projectId, userId });

    // リクエストボディからオプションを抽出（バリデーションはServiceで実施）
    const options: Partial<HTMLGeneratorOptions> = {
      framework: req.body.framework,
      includeResponsive: req.body.includeResponsive,
      includeGrid: req.body.includeGrid,
      breakpoints: req.body.breakpoints,
      minifyOutput: req.body.minifyOutput,
      includeComments: req.body.includeComments
    };

    // TODO: プロジェクト情報取得（Prisma経由）
    // const project = await prisma.project.findUnique({
    //   where: { id: projectId, userId }
    // });
    // if (!project) {
    //   res.status(404).json({ success: false, error: { code: 'PROJECT_NOT_FOUND', message: 'プロジェクトが見つかりません' }});
    //   return;
    // }

    // TODO: FIGLEANスコア取得
    // const analysisResult = await prisma.analysisResult.findFirst({
    //   where: { projectId },
    //   orderBy: { createdAt: 'desc' }
    // });
    // if (!analysisResult) {
    //   res.status(400).json({ success: false, error: { code: 'NO_ANALYSIS', message: '診断結果が見つかりません。先に診断を実行してください' }});
    //   return;
    // }
    // const figleanScore = analysisResult.overallScore;

    // TODO: Figmaデータ取得
    // const figmaData = await getFigmaFileData(project.figmaFileKey, userId);

    // 現時点ではモックデータで動作確認
    const mockFigmaData = {
      document: {
        id: '0:1',
        name: 'Page 1',
        type: 'FRAME',
        layoutMode: 'VERTICAL' as const,
        children: []
      }
    };
    const mockScore = 95;

    // HTML生成実行（Serviceレイヤーに委譲）
    const result = await htmlGeneratorService.generateHTML(
      projectId,
      userId,
      mockFigmaData,
      mockScore,
      options
    );

    // TODO: 生成結果をDBに保存
    // await prisma.generatedHTML.create({
    //   data: {
    //     id: result.id,
    //     projectId,
    //     userId,
    //     framework: result.framework,
    //     htmlCode: result.htmlCode,
    //     metadata: result.metadata,
    //     generationStatus: result.generationStatus,
    //     generationTimeMs: result.generationTimeMs
    //   }
    // });

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
      requestId: req.id
    });

    // バリデーションエラー（スコア不足など）
    if (error instanceof ValidationError) {
      // エラーメッセージからスコア不足かどうかを判定
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

// =====================================
// GET /api/html/:projectId/preview
// プレビュー取得
// =====================================

export async function getHTMLPreviewController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    logger.info('🔵 [CONTROLLER] getHTMLPreviewController', { projectId, userId });

    // TODO: 生成済みHTMLを取得
    // const generatedHTML = await prisma.generatedHTML.findFirst({
    //   where: { projectId, userId },
    //   orderBy: { createdAt: 'desc' }
    // });
    // if (!generatedHTML) {
    //   res.status(404).json({ success: false, error: { code: 'NO_HTML_GENERATED', message: '生成されたHTMLが見つかりません' }});
    //   return;
    // }

    // モックデータ
    const mockHTMLCode = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FIGLEAN Generated HTML</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="flex flex-col gap-4 p-8">
    <h1 class="text-4xl font-bold">Hello FIGLEAN</h1>
    <p class="text-base">This is a preview of generated HTML.</p>
  </div>
</body>
</html>`;

    // プレビューHTML生成（Serviceレイヤーに委譲）
    const previewHTML = htmlGeneratorService.generatePreview(mockHTMLCode);

    // HTMLを直接返す
    res.setHeader('Content-Type', 'text/html');
    res.send(previewHTML);
  } catch (error) {
    logger.error('❌ [CONTROLLER] getHTMLPreviewController エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// GET /api/html/:projectId/download
// ダウンロード
// =====================================

export async function downloadHTMLController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    logger.info('🔵 [CONTROLLER] downloadHTMLController', { projectId, userId });

    // TODO: 生成済みHTMLを取得
    // const generatedHTML = await prisma.generatedHTML.findFirst({
    //   where: { projectId, userId },
    //   orderBy: { createdAt: 'desc' }
    // });
    // if (!generatedHTML) {
    //   res.status(404).json({ success: false, error: { code: 'NO_HTML_GENERATED', message: '生成されたHTMLが見つかりません' }});
    //   return;
    // }

    // TODO: プロジェクト名取得
    // const project = await prisma.project.findUnique({
    //   where: { id: projectId }
    // });

    const mockProjectName = 'figlean-project';
    const mockHTMLCode = '<!DOCTYPE html><html>...</html>';

    // ZIPファイル生成（Serviceレイヤーに委譲）
    const zipContent = await htmlGeneratorService.generateDownloadZip(
      mockHTMLCode,
      mockProjectName
    );

    // 現時点ではHTMLファイルとして返す
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${mockProjectName}.html"`);
    res.send(zipContent);
  } catch (error) {
    logger.error('❌ [CONTROLLER] downloadHTMLController エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// GET /api/html/:projectId/history
// 生成履歴取得
// =====================================

export async function getHTMLHistoryController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;

    // クエリパラメータ
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    logger.info('🔵 [CONTROLLER] getHTMLHistoryController', {
      projectId,
      userId,
      limit,
      offset
    });

    // TODO: 生成履歴を取得
    // const history = await prisma.generatedHTML.findMany({
    //   where: { projectId, userId },
    //   orderBy: { createdAt: 'desc' },
    //   take: limit,
    //   skip: offset
    // });
    // const total = await prisma.generatedHTML.count({
    //   where: { projectId, userId }
    // });

    // モックデータ
    const mockHistory = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        framework: 'HTML_TAILWIND',
        generationStatus: 'COMPLETED',
        metadata: {
          totalLines: 245,
          tailwindClasses: 128,
          reproductionRate: 0.98,
          codeQualityScore: 94
        },
        generationTimeMs: 1234,
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: {
        history: mockHistory,
        pagination: {
          total: mockHistory.length,
          limit,
          offset,
          hasMore: false
        }
      }
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] getHTMLHistoryController エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// DELETE /api/html/:generatedId
// 削除
// =====================================

export async function deleteGeneratedHTMLController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { generatedId } = req.params;
    const userId = req.user.userId;

    logger.info('🔵 [CONTROLLER] deleteGeneratedHTMLController', { generatedId, userId });

    // TODO: 所有権確認と削除
    // const generatedHTML = await prisma.generatedHTML.findUnique({
    //   where: { id: generatedId }
    // });
    // if (!generatedHTML) {
    //   res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '生成されたHTMLが見つかりません' }});
    //   return;
    // }
    // if (generatedHTML.userId !== userId) {
    //   res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'この操作を実行する権限がありません' }});
    //   return;
    // }
    // await prisma.generatedHTML.delete({
    //   where: { id: generatedId }
    // });

    logger.info('✅ [CONTROLLER] 生成HTML削除成功', { generatedId });

    res.json({
      success: true,
      message: '生成されたHTMLを削除しました'
    });
  } catch (error) {
    logger.error('❌ [CONTROLLER] deleteGeneratedHTMLController エラー', {
      error,
      requestId: req.id
    });
    next(error);
  }
}

// =====================================
// Export
// =====================================

export default {
  generateHTMLController,
  getHTMLPreviewController,
  downloadHTMLController,
  getHTMLHistoryController,
  deleteGeneratedHTMLController
};