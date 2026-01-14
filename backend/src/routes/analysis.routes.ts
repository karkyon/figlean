// =====================================
// backend/src/routes/analysis.routes.ts
// 診断APIルーティング - FIGLEAN Phase 6.6
// 作成日時: 2026年1月11日
// 更新日時: 2026年1月14日 - ログ出力追加（既存機能100%保持）
// 依存関係: express, analysisController, authenticateToken
// 説明: 診断結果取得APIのルーティング設定（Swagger完全記述）
// =====================================

import { Router, Request, Response, NextFunction } from 'express';
import { 
  getAnalysisSummary, 
  getViolations, 
  getPredictions, 
  getSuggestions 
} from '../controllers/analysisController';
import { authenticateToken } from '../middlewares/authenticate';
import logger from '../utils/logger';

const router = Router();

// =====================================
// 初期化ログ
// =====================================
logger.info('🔍 Analysis Routes 初期化');

// =====================================
// 実装済みエンドポイント
// =====================================

/**
 * @swagger
 * /api/analysis/{projectId}:
 *   get:
 *     summary: 診断サマリー取得
 *     description: プロジェクトの診断結果サマリーを取得します（FIGLEAN適合度、カテゴリ別スコア等）
 *     tags:
 *       - 🔍 診断 (Analysis)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: プロジェクトID
 *     responses:
 *       200:
 *         description: 診断サマリー取得成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     figleanScore:
 *                       type: integer
 *                       description: FIGLEAN適合度スコア（0-100）
 *                       example: 82
 *                     layoutScore:
 *                       type: integer
 *                       example: 85
 *                     componentScore:
 *                       type: integer
 *                       example: 78
 *                     responsiveScore:
 *                       type: integer
 *                       example: 80
 *                     semanticScore:
 *                       type: integer
 *                       example: 85
 *                     canGenerateHTML:
 *                       type: boolean
 *                       description: HTML生成可能か（90%以上）
 *                       example: false
 *                     canUseGrid:
 *                       type: boolean
 *                       description: Grid生成可能か（100%のみ）
 *                       example: false
 *                     violations:
 *                       type: object
 *                       properties:
 *                         critical:
 *                           type: integer
 *                           example: 3
 *                         major:
 *                           type: integer
 *                           example: 7
 *                         minor:
 *                           type: integer
 *                           example: 12
 *                     totalFrames:
 *                       type: integer
 *                       example: 25
 *                     analyzedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-11T10:30:00.000Z"
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: プロジェクトまたは診断結果が見つかりません
 */
router.get(
  '/:projectId',
  (req: Request, res: Response, next: NextFunction) => {
    logger.info('🟢 [ROUTE] /:projectId - リクエスト受信', { 
      projectId: req.params.projectId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    next();
  },
  authenticateToken,
  (req: Request, _res: Response, next: NextFunction) => {
    logger.info('🟢 [ROUTE] /:projectId - 認証通過後', { 
      projectId: req.params.projectId,
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString()
    });
    next();
  },
  getAnalysisSummary
);

/**
 * @swagger
 * /api/analysis/{projectId}/violations:
 *   get:
 *     summary: ルール違反一覧取得
 *     description: プロジェクトのルール違反一覧を取得します
 *     tags:
 *       - 🔍 診断 (Analysis)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: プロジェクトID
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [CRITICAL, MAJOR, MINOR]
 *         description: 重要度でフィルター
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: 取得件数（最大100）
 *     responses:
 *       200:
 *         description: ルール違反一覧取得成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     violations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           frameName:
 *                             type: string
 *                             example: "section-hero"
 *                           frameId:
 *                             type: string
 *                             example: "123:456"
 *                           ruleId:
 *                             type: string
 *                             example: "AUTO_LAYOUT_REQUIRED"
 *                           ruleName:
 *                             type: string
 *                             example: "Auto Layout必須"
 *                           ruleCategory:
 *                             type: string
 *                             enum: [LAYOUT, COMPONENT, RESPONSIVE, SEMANTIC, CONSTRAINT, STRUCTURE]
 *                           severity:
 *                             type: string
 *                             enum: [CRITICAL, MAJOR, MINOR]
 *                           description:
 *                             type: string
 *                             example: "このFrameにAuto Layoutが設定されていません"
 *                           impact:
 *                             type: string
 *                             example: "レスポンシブ対応が困難になります"
 *                           suggestion:
 *                             type: string
 *                             example: "Auto Layoutを適用してください"
 *                     total:
 *                       type: integer
 *                       example: 22
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: プロジェクトまたは診断結果が見つかりません
 */
router.get(
  '/:projectId/violations',
  (req: Request, res: Response, next: NextFunction) => {
    logger.info('🟢 [ROUTE] /:projectId/violations - リクエスト受信', { 
      projectId: req.params.projectId,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
    next();
  },
  authenticateToken,
  (req: Request, _res: Response, next: NextFunction) => {
    logger.info('🟢 [ROUTE] /:projectId/violations - 認証通過後', { 
      projectId: req.params.projectId,
      userId: (req as any).user?.userId,
      severity: req.query.severity,
      limit: req.query.limit,
      timestamp: new Date().toISOString()
    });
    next();
  },
  getViolations
);

// =====================================
// Phase 8: 崩壊予測・改善提案
// =====================================

/**
 * @swagger
 * /api/analysis/{projectId}/predictions:
 *   get:
 *     summary: 崩壊予測取得
 *     description: レスポンシブ崩壊予測を取得します
 *     tags:
 *       - 🔍 診断 (Analysis)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: プロジェクトID
 *     responses:
 *       200:
 *         description: 崩壊予測取得成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     predictions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           breakType:
 *                             type: string
 *                             example: "HORIZONTAL_SCROLL"
 *                           breakTitle:
 *                             type: string
 *                             example: "SP幅で横スクロール発生"
 *                           affectedFrame:
 *                             type: string
 *                             example: "HeroSection"
 *                           breakpoint:
 *                             type: string
 *                             example: "mobile"
 *                           screenWidth:
 *                             type: integer
 *                             example: 375
 *                           fixSuggestion:
 *                             type: string
 *                             example: "Width を Fill に変更してください"
 *                           severity:
 *                             type: string
 *                             enum: [CRITICAL, MAJOR, MINOR]
 *                     responsiveIssues:
 *                       type: object
 *                       properties:
 *                         mobile:
 *                           type: object
 *                           properties:
 *                             width:
 *                               type: string
 *                               example: "375px"
 *                             issues:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               example: ["横スクロール発生 (HeroSection)"]
 *                         tablet:
 *                           type: object
 *                         desktop:
 *                           type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalPredictions:
 *                           type: integer
 *                           example: 5
 *                         criticalCount:
 *                           type: integer
 *                           example: 2
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: プロジェクトが見つかりません
 *       500:
 *         description: サーバーエラー
 */
router.get(
  '/:projectId/predictions',
  (req: Request, res: Response, next: NextFunction) => {
    logger.info('🟢 [ROUTE] /:projectId/predictions - リクエスト受信', { 
      projectId: req.params.projectId,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
    next();
  },
  authenticateToken,
  (req: Request, _res: Response, next: NextFunction) => {
    logger.info('🟢 [ROUTE] /:projectId/predictions - 認証通過後', { 
      projectId: req.params.projectId,
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString()
    });
    next();
  },
  getPredictions
);

/**
 * @swagger
 * /api/analysis/{projectId}/suggestions:
 *   get:
 *     summary: 改善提案取得
 *     description: FIGLEAN適合度改善提案を取得します
 *     tags:
 *       - 🔍 診断 (Analysis)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: プロジェクトID
 *     responses:
 *       200:
 *         description: 改善提案取得成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           priority:
 *                             type: integer
 *                             example: 1
 *                           title:
 *                             type: string
 *                             example: "HeroSection に Auto Layout を設定"
 *                           description:
 *                             type: string
 *                             example: "Direction: Horizontal / Gap: 24px"
 *                           targetFrame:
 *                             type: string
 *                             example: "HeroSection"
 *                           impactLevel:
 *                             type: string
 *                             enum: [HIGH, MEDIUM, LOW]
 *                           scoreImprovement:
 *                             type: integer
 *                             example: 8
 *                           estimatedTime:
 *                             type: string
 *                             example: "5分"
 *                           difficulty:
 *                             type: string
 *                             enum: [EASY, MEDIUM, HARD]
 *                     improvementSimulation:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                           example: 82
 *                         afterHighPriority:
 *                           type: integer
 *                           example: 91
 *                         afterAll:
 *                           type: integer
 *                           example: 98
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSuggestions:
 *                           type: integer
 *                           example: 8
 *                         highPriorityCount:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: プロジェクトが見つかりません
 *       500:
 *         description: サーバーエラー
 */
router.get(
  '/:projectId/suggestions',
  (req: Request, res: Response, next: NextFunction) => {
    logger.info('🟢 [ROUTE] /:projectId/suggestions - リクエスト受信', { 
      projectId: req.params.projectId,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
    next();
  },
  authenticateToken,
  (req: Request, _res: Response, next: NextFunction) => {
    logger.info('🟢 [ROUTE] /:projectId/suggestions - 認証通過後', { 
      projectId: req.params.projectId,
      userId: (req as any).user?.userId,
      timestamp: new Date().toISOString()
    });
    next();
  },
  getSuggestions
);

// =====================================
// Export
// =====================================

logger.info('📊 Analysis エンドポイント登録完了:', {
  endpoints: [
    'GET  /api/analysis/:projectId',
    'GET  /api/analysis/:projectId/violations',
    'GET  /api/analysis/:projectId/predictions',
    'GET  /api/analysis/:projectId/suggestions'
  ]
});

export default router;