// =====================================
// backend/src/routes/figmaComment.routes.ts
// Figmaコメント投稿ルーティング - FIGLEAN Phase 7
// 作成日時: 2026年1月12日
// 依存関係: express, figmaCommentController, authenticateToken
// 説明: Figmaコメント投稿APIのルート定義とSwagger documentation
// =====================================

import { Router } from 'express';
import * as figmaCommentController from '../controllers/figmaCommentController';
import { authenticateToken } from '../middlewares/authenticate';

const router = Router();

// =====================================
// ルート定義
// =====================================

/**
 * @swagger
 * /api/figma/comments/{projectId}/{violationId}:
 *   post:
 *     summary: 単一ルール違反へのコメント投稿
 *     tags: ['💬 コメント投稿 (Comments)']
 *     description: 特定のルール違反に対してFigmaにコメントを投稿します
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
 *       - in: path
 *         name: violationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ルール違反ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeFixSteps:
 *                 type: boolean
 *                 default: true
 *                 description: 修正手順を含めるか
 *               includeDetectedValue:
 *                 type: boolean
 *                 default: true
 *                 description: 検出値を含めるか
 *               language:
 *                 type: string
 *                 enum: [ja, en]
 *                 default: ja
 *                 description: 言語
 *     responses:
 *       200:
 *         description: コメント投稿成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: ルール違反が見つかりません
 *       500:
 *         description: サーバーエラー
 */
router.post(
  '/:projectId/:violationId',
  authenticateToken(),
  figmaCommentController.postCommentToViolation
);

/**
 * @swagger
 * /api/figma/comments/{projectId}:
 *   post:
 *     summary: プロジェクト全体への一括コメント投稿
 *     tags: ['💬 コメント投稿 (Comments)']
 *     description: プロジェクト内の全ルール違反に対してFigmaにコメントを一括投稿します
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeFixSteps:
 *                 type: boolean
 *                 default: true
 *                 description: 修正手順を含めるか
 *               includeDetectedValue:
 *                 type: boolean
 *                 default: true
 *                 description: 検出値を含めるか
 *               language:
 *                 type: string
 *                 enum: [ja, en]
 *                 default: ja
 *                 description: 言語
 *               minSeverity:
 *                 type: string
 *                 enum: [CRITICAL, MAJOR, MINOR]
 *                 description: 最小重要度（指定した重要度以上のみ投稿）
 *                 example: MAJOR
 *     responses:
 *       200:
 *         description: 一括コメント投稿完了
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: プロジェクトが見つかりません
 *       500:
 *         description: サーバーエラー
 */
router.post(
  '/:projectId',
  authenticateToken(),
  figmaCommentController.postCommentsToProject
);

/**
 * @swagger
 * /api/figma/comments/{projectId}:
 *   get:
 *     summary: 投稿済みコメント一覧取得
 *     tags: ['💬 コメント投稿 (Comments)']
 *     description: プロジェクト内で既にFigmaに投稿されたコメントの一覧を取得します
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
 *         description: 投稿済みコメント一覧取得成功
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: プロジェクトが見つかりません
 *       500:
 *         description: サーバーエラー
 */
router.get(
  '/:projectId',
  authenticateToken(),
  figmaCommentController.getPostedComments
);

/**
 * @swagger
 * /api/figma/comments/{projectId}/{violationId}:
 *   delete:
 *     summary: 特定コメントの削除
 *     tags: ['💬 コメント投稿 (Comments)']
 *     description: Figmaに投稿されたコメントを削除し、データベースのフラグをリセットします
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
 *       - in: path
 *         name: violationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ルール違反ID
 *     responses:
 *       200:
 *         description: コメント削除成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: コメントが見つかりません
 *       500:
 *         description: サーバーエラー
 */
router.delete(
  '/:projectId/:violationId',
  authenticateToken(),
  figmaCommentController.deleteCommentFromViolation
);

/**
 * @swagger
 * /api/figma/comments/{projectId}:
 *   delete:
 *     summary: コメントフラグのリセット
 *     tags: ['💬 コメント投稿 (Comments)']
 *     description: プロジェクト内の全コメントフラグをリセットします（再診断時に使用）
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
 *         description: コメントフラグリセット成功
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: プロジェクトが見つかりません
 *       500:
 *         description: サーバーエラー
 */
router.delete(
  '/:projectId',
  authenticateToken(),
  figmaCommentController.resetProjectComments
);

/**
 * @swagger
 * /api/figma/comments/{projectId}/{violationId}/preview:
 *   get:
 *     summary: コメントメッセージプレビュー
 *     tags: ['💬 コメント投稿 (Comments)']
 *     description: 投稿前にコメントメッセージの内容をプレビューします
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
 *       - in: path
 *         name: violationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ルール違反ID
 *       - in: query
 *         name: includeFixSteps
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 修正手順を含めるか
 *       - in: query
 *         name: includeDetectedValue
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 検出値を含めるか
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [ja, en]
 *           default: ja
 *         description: 言語
 *     responses:
 *       200:
 *         description: コメントプレビュー生成成功
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *       404:
 *         description: ルール違反が見つかりません
 *       500:
 *         description: サーバーエラー
 */
router.get(
  '/:projectId/:violationId/preview',
  authenticateToken(),
  figmaCommentController.previewCommentMessage
);

// =====================================
// エクスポート
// =====================================

export default router;