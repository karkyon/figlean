// =====================================
// ファイルパス: backend/src/routes/autofix.routes.ts
// 概要: AutoFix APIルーティング定義
// 機能説明: AutoFix機能のエンドポイント定義とミドルウェア設定
// 作成日: 2026-01-17
// 更新日: 2026-01-17
// 更新理由: 新規作成
// 依存関係: Express Router, autofixController, authenticateToken
// =====================================

import { Router } from 'express';
import * as autofixController from '../controllers/autofixController';
import { authenticateToken } from '../middlewares/authenticate';

const router = Router();

// =====================================
// 全ルートに認証必須
// =====================================

router.use(authenticateToken());

// =====================================
// AutoFix設定管理
// =====================================

/**
 * @openapi
 * /api/autofix/config:
 *   get:
 *     summary: AutoFix設定取得
 *     description: ユーザーのAutoFix自動修正設定を取得
 *     tags: ['🔧 AutoFix']
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AutoFix設定取得成功
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
 *                     enableAutoLayout:
 *                       type: boolean
 *                     enableSizeConstraint:
 *                       type: boolean
 *                     enableNaming:
 *                       type: boolean
 *                     enableComponent:
 *                       type: boolean
 *                     enableStyle:
 *                       type: boolean
 *                     enabledFixTypes:
 *                       type: object
 *                     autoDeleteComments:
 *                       type: boolean
 */
router.get('/config', authenticateToken(), autofixController.getConfig);

/**
 * @openapi
 * /api/autofix/config:
 *   put:
 *     summary: AutoFix設定更新
 *     description: ユーザーのAutoFix自動修正設定を更新
 *     tags: ['🔧 AutoFix']
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enableAutoLayout:
 *                 type: boolean
 *               enableSizeConstraint:
 *                 type: boolean
 *               enableNaming:
 *                 type: boolean
 *               enableComponent:
 *                 type: boolean
 *               enableStyle:
 *                 type: boolean
 *               enabledFixTypes:
 *                 type: object
 *               autoDeleteComments:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: AutoFix設定更新成功
 */
router.put('/config', authenticateToken(), autofixController.updateConfig);

/**
 * @openapi
 * /api/autofix/config/reset:
 *   post:
 *     summary: AutoFix設定リセット
 *     description: ユーザーのAutoFix設定をデフォルトに戻す
 *     tags: ['🔧 AutoFix']
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AutoFix設定リセット成功
 */
router.post('/config/reset', authenticateToken(), autofixController.resetConfig);

// =====================================
// AutoFix実行
// =====================================

/**
 * @openapi
 * /api/autofix/{projectId}/preview:
 *   post:
 *     summary: AutoFix修正プレビュー生成
 *     description: 指定した違反項目の修正内容をプレビュー
 *     tags: ['🔧 AutoFix']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - violationIds
 *             properties:
 *               violationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 修正する違反ID配列
 *               deleteComments:
 *                 type: boolean
 *                 description: コメント削除するか
 *                 default: false
 *     responses:
 *       200:
 *         description: プレビュー生成成功
 */
router.post('/:projectId/preview', authenticateToken(), autofixController.generatePreview);

/**
 * @openapi
 * /api/autofix/{projectId}/execute:
 *   post:
 *     summary: AutoFix修正実行
 *     description: 指定した違反項目をFigma APIで自動修正
 *     tags: ['🔧 AutoFix']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - violationIds
 *             properties:
 *               violationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: 修正する違反ID配列
 *               deleteComments:
 *                 type: boolean
 *                 description: コメント削除するか
 *                 default: false
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum:
 *                     - AUTO_LAYOUT
 *                     - SIZE_CONSTRAINT
 *                     - NAMING
 *                     - COMPONENT
 *                     - STYLE
 *                 description: 実行するカテゴリ（省略時は全カテゴリ）
 *               fixTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 実行する修正タイプ（省略時はユーザー設定に従う）
 *     responses:
 *       200:
 *         description: AutoFix実行成功
 */
router.post('/:projectId/execute', authenticateToken(), autofixController.executeAutoFix);

/**
 * @openapi
 * /api/autofix/{projectId}/execute/individual:
 *   post:
 *     summary: 個別違反の自動修正
 *     description: 1つの違反項目を個別に自動修正
 *     tags: ['🔧 AutoFix']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - violationId
 *             properties:
 *               violationId:
 *                 type: string
 *                 format: uuid
 *                 description: 修正する違反ID
 *               deleteComment:
 *                 type: boolean
 *                 description: コメント削除するか
 *                 default: false
 *     responses:
 *       200:
 *         description: 個別修正実行成功
 */
router.post('/:projectId/execute/individual', authenticateToken(), autofixController.executeIndividualFix);

// =====================================
// AutoFix履歴管理
// =====================================

/**
 * @openapi
 * /api/autofix/{projectId}/history:
 *   get:
 *     summary: AutoFix実行履歴取得
 *     description: プロジェクトのAutoFix実行履歴を取得
 *     tags: ['🔧 AutoFix']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             - PENDING
 *             - EXECUTING
 *             - COMPLETED
 *             - FAILED
 *             - ROLLED_BACK
 *     responses:
 *       200:
 *         description: AutoFix履歴取得成功
 */
router.get('/:projectId/history', authenticateToken(), autofixController.getHistories);

/**
 * @openapi
 * /api/autofix/history/{historyId}:
 *   get:
 *     summary: AutoFix履歴詳細取得
 *     description: 特定のAutoFix実行履歴の詳細を取得
 *     tags: ['🔧 AutoFix']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: historyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: AutoFix履歴詳細取得成功
 */
router.get('/history/:historyId', authenticateToken(), autofixController.getHistoryDetail);

/**
 * @openapi
 * /api/autofix/rollback:
 *   post:
 *     summary: AutoFix修正のロールバック
 *     description: 実行済みのAutoFix修正を元に戻す
 *     tags: ['🔧 AutoFix']
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - historyIds
 *             properties:
 *               historyIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: ロールバックする履歴ID配列
 *     responses:
 *       200:
 *         description: Rollback実行成功
 */
router.post('/rollback', authenticateToken(), autofixController.rollbackAutoFix);

export default router;