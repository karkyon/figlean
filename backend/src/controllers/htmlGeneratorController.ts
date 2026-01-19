// =====================================
// ファイルパス: backend/src/controllers/htmlGeneratorController.ts
// 概要: HTML生成コントローラー（薄い層）
// 機能説明:
//   - リクエスト/レスポンス処理のみ
//   - Serviceレイヤーへの委譲
//   - エラーハンドリング
// 作成日: 2026-01-12
// 更新日: 2026-01-19 - リアルなモックデータに修正
// =====================================

import { Request, Response, NextFunction } from 'express';
import { getHTMLGeneratorService } from '../services/htmlGeneratorService';
import type { HTMLGeneratorOptions, FigmaNode } from '../types/html';
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

    // =====================================
    // リアルなモックデータ（テスト用）
    // =====================================
    const mockFigmaData: { document: FigmaNode } = {
      document: {
        id: '0:1',
        name: 'Page 1',
        type: 'FRAME',
        layoutMode: 'VERTICAL',
        itemSpacing: 24,
        paddingTop: 40,
        paddingBottom: 40,
        paddingLeft: 40,
        paddingRight: 40,
        layoutSizingHorizontal: 'FILL',
        layoutSizingVertical: 'HUG',
        primaryAxisAlignItems: 'MIN',
        counterAxisAlignItems: 'CENTER',
        children: [
          // Header
          {
            id: '1:1',
            name: 'Header',
            type: 'FRAME',
            layoutMode: 'HORIZONTAL',
            itemSpacing: 16,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 24,
            paddingRight: 24,
            layoutSizingHorizontal: 'FILL',
            layoutSizingVertical: 'HUG',
            primaryAxisAlignItems: 'CENTER',
            counterAxisAlignItems: 'CENTER',
            fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 } }],
            children: [
              {
                id: '1:2',
                name: 'Logo',
                type: 'TEXT',
                characters: 'FIGLEAN',
                style: {
                  fontSize: 24,
                  fontWeight: 700,
                  textAlignHorizontal: 'LEFT'
                },
                fills: [{ type: 'SOLID', visible: true, color: { r: 0.2, g: 0.3, b: 0.9 } }]
              },
              {
                id: '1:3',
                name: 'Nav',
                type: 'FRAME',
                layoutMode: 'HORIZONTAL',
                itemSpacing: 24,
                layoutSizingHorizontal: 'HUG',
                layoutSizingVertical: 'HUG',
                children: [
                  {
                    id: '1:4',
                    name: 'Link1',
                    type: 'TEXT',
                    characters: 'Home',
                    style: { fontSize: 16, fontWeight: 500 },
                    fills: [{ type: 'SOLID', visible: true, color: { r: 0.3, g: 0.3, b: 0.3 } }]
                  },
                  {
                    id: '1:5',
                    name: 'Link2',
                    type: 'TEXT',
                    characters: 'Projects',
                    style: { fontSize: 16, fontWeight: 500 },
                    fills: [{ type: 'SOLID', visible: true, color: { r: 0.3, g: 0.3, b: 0.3 } }]
                  },
                  {
                    id: '1:6',
                    name: 'Link3',
                    type: 'TEXT',
                    characters: 'About',
                    style: { fontSize: 16, fontWeight: 500 },
                    fills: [{ type: 'SOLID', visible: true, color: { r: 0.3, g: 0.3, b: 0.3 } }]
                  }
                ]
              }
            ]
          },
          // Main Content
          {
            id: '2:1',
            name: 'Main Content',
            type: 'FRAME',
            layoutMode: 'VERTICAL',
            itemSpacing: 32,
            paddingTop: 48,
            paddingBottom: 48,
            paddingLeft: 24,
            paddingRight: 24,
            layoutSizingHorizontal: 'FILL',
            layoutSizingVertical: 'HUG',
            children: [
              {
                id: '2:2',
                name: 'Hero Title',
                type: 'TEXT',
                characters: 'Welcome to FIGLEAN',
                style: {
                  fontSize: 48,
                  fontWeight: 700,
                  textAlignHorizontal: 'CENTER'
                },
                fills: [{ type: 'SOLID', visible: true, color: { r: 0.1, g: 0.1, b: 0.1 } }]
              },
              {
                id: '2:3',
                name: 'Hero Description',
                type: 'TEXT',
                characters: 'Transform your Figma designs into production-ready HTML with Tailwind CSS',
                style: {
                  fontSize: 20,
                  fontWeight: 400,
                  textAlignHorizontal: 'CENTER'
                },
                fills: [{ type: 'SOLID', visible: true, color: { r: 0.4, g: 0.4, b: 0.4 } }]
              },
              // Cards Section
              {
                id: '2:4',
                name: 'Cards',
                type: 'FRAME',
                layoutMode: 'HORIZONTAL',
                layoutWrap: 'WRAP',
                itemSpacing: 24,
                layoutSizingHorizontal: 'FILL',
                layoutSizingVertical: 'HUG',
                children: [
                  {
                    id: '2:5',
                    name: 'Card 1',
                    type: 'FRAME',
                    layoutMode: 'VERTICAL',
                    itemSpacing: 16,
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    layoutSizingHorizontal: 'FIXED',
                    layoutSizingVertical: 'HUG',
                    absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
                    fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 } }],
                    cornerRadius: 8,
                    children: [
                      {
                        id: '2:6',
                        name: 'Card Title',
                        type: 'TEXT',
                        characters: 'Auto Layout Analysis',
                        style: { fontSize: 24, fontWeight: 600 },
                        fills: [{ type: 'SOLID', visible: true, color: { r: 0.1, g: 0.1, b: 0.1 } }]
                      },
                      {
                        id: '2:7',
                        name: 'Card Description',
                        type: 'TEXT',
                        characters: 'Comprehensive analysis of your Figma Auto Layout settings',
                        style: { fontSize: 16, fontWeight: 400 },
                        fills: [{ type: 'SOLID', visible: true, color: { r: 0.5, g: 0.5, b: 0.5 } }]
                      }
                    ]
                  },
                  {
                    id: '2:8',
                    name: 'Card 2',
                    type: 'FRAME',
                    layoutMode: 'VERTICAL',
                    itemSpacing: 16,
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    layoutSizingHorizontal: 'FIXED',
                    layoutSizingVertical: 'HUG',
                    absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
                    fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 } }],
                    cornerRadius: 8,
                    children: [
                      {
                        id: '2:9',
                        name: 'Card Title',
                        type: 'TEXT',
                        characters: 'HTML Generation',
                        style: { fontSize: 24, fontWeight: 600 },
                        fills: [{ type: 'SOLID', visible: true, color: { r: 0.1, g: 0.1, b: 0.1 } }]
                      },
                      {
                        id: '2:10',
                        name: 'Card Description',
                        type: 'TEXT',
                        characters: 'Generate production-ready HTML with Tailwind CSS',
                        style: { fontSize: 16, fontWeight: 400 },
                        fills: [{ type: 'SOLID', visible: true, color: { r: 0.5, g: 0.5, b: 0.5 } }]
                      }
                    ]
                  },
                  {
                    id: '2:11',
                    name: 'Card 3',
                    type: 'FRAME',
                    layoutMode: 'VERTICAL',
                    itemSpacing: 16,
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    layoutSizingHorizontal: 'FIXED',
                    layoutSizingVertical: 'HUG',
                    absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
                    fills: [{ type: 'SOLID', visible: true, color: { r: 1, g: 1, b: 1 } }],
                    cornerRadius: 8,
                    children: [
                      {
                        id: '2:12',
                        name: 'Card Title',
                        type: 'TEXT',
                        characters: 'Responsive Design',
                        style: { fontSize: 24, fontWeight: 600 },
                        fills: [{ type: 'SOLID', visible: true, color: { r: 0.1, g: 0.1, b: 0.1 } }]
                      },
                      {
                        id: '2:13',
                        name: 'Card Description',
                        type: 'TEXT',
                        characters: 'Mobile-first responsive design with Tailwind breakpoints',
                        style: { fontSize: 16, fontWeight: 400 },
                        fills: [{ type: 'SOLID', visible: true, color: { r: 0.5, g: 0.5, b: 0.5 } }]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          // Footer
          {
            id: '3:1',
            name: 'Footer',
            type: 'FRAME',
            layoutMode: 'VERTICAL',
            itemSpacing: 16,
            paddingTop: 32,
            paddingBottom: 32,
            paddingLeft: 24,
            paddingRight: 24,
            layoutSizingHorizontal: 'FILL',
            layoutSizingVertical: 'HUG',
            fills: [{ type: 'SOLID', visible: true, color: { r: 0.95, g: 0.95, b: 0.95 } }],
            children: [
              {
                id: '3:2',
                name: 'Copyright',
                type: 'TEXT',
                characters: '© 2026 FIGLEAN. All rights reserved.',
                style: {
                  fontSize: 14,
                  fontWeight: 400,
                  textAlignHorizontal: 'CENTER'
                },
                fills: [{ type: 'SOLID', visible: true, color: { r: 0.5, g: 0.5, b: 0.5 } }]
              }
            ]
          }
        ]
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
      requestId: (req as any).id
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
      requestId: (req as any).id
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

    // HTML生成（Serviceレイヤーに委譲）
    const htmlContent = await htmlGeneratorService.generateDownloadZip(
      mockHTMLCode,
      mockProjectName
    );

    // 現時点ではHTMLファイルとして返す
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${mockProjectName}.html"`);
    res.send(htmlContent);
  } catch (error) {
    logger.error('❌ [CONTROLLER] downloadHTMLController エラー', {
      error,
      requestId: (req as any).id
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

    logger.info('🔵 [CONTROLLER] getHTMLHistoryController', { projectId, userId, limit, offset });

    // TODO: 生成履歴を取得
    // const history = await prisma.generatedHTML.findMany({
    //   where: { projectId, userId },
    //   orderBy: { createdAt: 'desc' },
    //   skip: offset,
    //   take: limit
    // });

    // TODO: 総数を取得
    // const total = await prisma.generatedHTML.count({
    //   where: { projectId, userId }
    // });

    // モックデータ
    res.json({
      success: true,
      data: {
        history: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
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

// =====================================
// DELETE /api/html/:generatedId
// 生成済みHTML削除
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

    // TODO: 削除
    // const deleted = await prisma.generatedHTML.deleteMany({
    //   where: {
    //     id: generatedId,
    //     userId
    //   }
    // });
    //
    // if (deleted.count === 0) {
    //   res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '指定されたHTMLが見つかりません' }});
    //   return;
    // }

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