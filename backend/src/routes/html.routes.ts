// =====================================
// backend/src/routes/html.routes.ts
// HTML生成ルート - FIGLEAN Phase 9
// 作成日時: 2026年1月12日
// 説明: HTML生成APIエンドポイント定義とSwagger統合
// =====================================

import { Router } from 'express';
import {
  generateHTMLController,
  getHTMLPreviewController,
  downloadHTMLController,
  getHTMLHistoryController,
  deleteGeneratedHTMLController
} from '../controllers/htmlGeneratorController';
import { authenticateToken } from '../middlewares/authenticate';

const router = Router();

// =====================================
// Swagger/OpenAPI ドキュメント
// =====================================

/**
 * @openapi
 * /api/html/generate/{projectId}:
 *   post:
 *     summary: HTML生成実行
 *     description: |
 *       プロジェクトからHTML/CSSコードを生成します。
 *       - FIGLEANスコア90%以上が必要
 *       - スコア100%の場合のみGrid生成が可能
 *     tags: ['🎨 HTML生成 (HTML Generator)']
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               framework:
 *                 type: string
 *                 enum: [HTML_TAILWIND, REACT_JSX, VUE_SFC]
 *                 default: HTML_TAILWIND
 *                 description: 生成フレームワーク
 *               includeResponsive:
 *                 type: boolean
 *                 default: true
 *                 description: レスポンシブ対応を含める
 *               includeGrid:
 *                 type: boolean
 *                 default: false
 *                 description: Grid生成を有効にする（スコア100%時のみ）
 *               breakpoints:
 *                 type: object
 *                 description: カスタムBreakpoint設定
 *                 properties:
 *                   mobile:
 *                     type: integer
 *                     default: 640
 *                   tablet:
 *                     type: integer
 *                     default: 768
 *                   desktop:
 *                     type: integer
 *                     default: 1024
 *                   wide:
 *                     type: integer
 *                     default: 1280
 *               minifyOutput:
 *                 type: boolean
 *                 default: false
 *                 description: 出力コードを最小化
 *               includeComments:
 *                 type: boolean
 *                 default: false
 *                 description: コメントを含める
 *           examples:
 *             basic:
 *               summary: 基本的な生成
 *               value:
 *                 framework: HTML_TAILWIND
 *                 includeResponsive: true
 *                 includeGrid: false
 *             withGrid:
 *               summary: Grid生成（スコア100%時）
 *               value:
 *                 framework: HTML_TAILWIND
 *                 includeResponsive: true
 *                 includeGrid: true
 *             customBreakpoints:
 *               summary: カスタムBreakpoint
 *               value:
 *                 framework: HTML_TAILWIND
 *                 includeResponsive: true
 *                 breakpoints:
 *                   mobile: 480
 *                   tablet: 768
 *                   desktop: 1200
 *                   wide: 1600
 *     responses:
 *       201:
 *         description: HTML生成成功
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
 *                     generatedId:
 *                       type: string
 *                       format: uuid
 *                       description: 生成ID
 *                     htmlCode:
 *                       type: string
 *                       description: 生成されたHTMLコード
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         totalLines:
 *                           type: integer
 *                           description: 総行数
 *                         tailwindClasses:
 *                           type: integer
 *                           description: Tailwindクラス数
 *                         reproductionRate:
 *                           type: number
 *                           format: float
 *                           description: 再現率（0.0-1.0）
 *                         codeQualityScore:
 *                           type: integer
 *                           description: コード品質スコア（0-100）
 *                     generationTimeMs:
 *                       type: integer
 *                       description: 生成時間（ミリ秒）
 *                     previewUrl:
 *                       type: string
 *                       description: プレビューURL
 *                     downloadUrl:
 *                       type: string
 *                       description: ダウンロードURL
 *       400:
 *         description: スコア不足またはリクエストエラー
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: SCORE_TOO_LOW
 *                     message:
 *                       type: string
 *                       example: "HTML生成にはFIGLEANスコア90%以上が必要です（現在: 82%）"
 *                     details:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/generate/:projectId', authenticateToken(), generateHTMLController as any);

/**
 * @openapi
 * /api/html/{projectId}/preview:
 *   get:
 *     summary: HTMLプレビュー取得
 *     description: 生成されたHTMLをプレビュー用にレンダリングして取得
 *     tags: ['🎨 HTML生成 (HTML Generator)']
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
 *         description: プレビューHTML
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: '<!DOCTYPE html><html>...</html>'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: 生成されたHTMLが見つかりません
 */
router.get('/:projectId/preview', authenticateToken(), getHTMLPreviewController as any);

/**
 * @openapi
 * /api/html/{projectId}/download:
 *   get:
 *     summary: HTMLダウンロード
 *     description: 生成されたHTMLをZIPファイルとしてダウンロード
 *     tags: ['🎨 HTML生成 (HTML Generator)']
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
 *         description: ZIPファイル
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: 生成されたHTMLが見つかりません
 */
router.get('/:projectId/download', authenticateToken(), downloadHTMLController as any);

/**
 * @openapi
 * /api/html/{projectId}/history:
 *   get:
 *     summary: HTML生成履歴取得
 *     description: プロジェクトのHTML生成履歴を取得
 *     tags: ['🎨 HTML生成 (HTML Generator)']
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 取得件数
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: オフセット
 *     responses:
 *       200:
 *         description: HTML生成履歴
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
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           framework:
 *                             type: string
 *                           generationStatus:
 *                             type: string
 *                             enum: [COMPLETED, FAILED]
 *                           metadata:
 *                             type: object
 *                           generationTimeMs:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/:projectId/history', authenticateToken(), getHTMLHistoryController as any);

/**
 * @openapi
 * /api/html/{generatedId}:
 *   delete:
 *     summary: 生成HTML削除
 *     description: 生成されたHTMLを削除
 *     tags: ['🎨 HTML生成 (HTML Generator)']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: generatedId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 生成ID
 *     responses:
 *       200:
 *         description: 削除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "生成されたHTMLを削除しました"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:generatedId', authenticateToken(), deleteGeneratedHTMLController as any);

// =====================================
// Export
// =====================================

export default router;