// =====================================
// backend/src/routes/figma.routes.ts
// Figma連携ルート - FIGLEAN Phase 6
// 作成日時: 2026年1月11日
// 依存関係: express, figmaController, authenticateToken
// 説明: Figma API関連のルーティング定義
// =====================================

import { Router } from 'express';
import figmaController from '../controllers/figmaController';
import { authenticateToken } from '../middlewares/authenticate';
import logger from '../utils/logger';

const router = Router();

logger.info('📁 Figma Routes 初期化');

/**
 * @openapi
 * /api/figma/user:
 *   get:
 *     summary: Figmaユーザー情報取得
 *     description: 現在認証されているユーザーのFigmaアカウント情報を取得
 *     tags: ['🔌 Figma連携 (Figma)']
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Figmaユーザー情報取得成功
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
 *                     id:
 *                       type: string
 *                       description: FigmaユーザーID
 *                       example: "123456789"
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "user@example.com"
 *                     handle:
 *                       type: string
 *                       description: Figmaハンドル名
 *                       example: "user_handle"
 *                     img_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: プロフィール画像URL
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Figmaトークンが登録されていません
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user', authenticateToken(), figmaController.getFigmaUserInfo);

/**
 * @openapi
 * /api/figma/files:
 *   get:
 *     summary: Figmaファイル一覧取得
 *     description: ユーザーがアクセス可能なFigmaファイルの一覧を取得
 *     tags: ['🔌 Figma連携 (Figma)']
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Figmaファイル一覧取得成功
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
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           key:
 *                             type: string
 *                             description: FigmaファイルKey
 *                             example: "abc123xyz"
 *                           name:
 *                             type: string
 *                             description: ファイル名
 *                             example: "Landing Page Design"
 *                           thumbnail_url:
 *                             type: string
 *                             format: uri
 *                             nullable: true
 *                             description: サムネイルURL
 *                           last_modified:
 *                             type: string
 *                             format: date-time
 *                             description: 最終更新日時
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Figmaトークンが登録されていません
 */
router.get('/files', authenticateToken(), figmaController.getFigmaFilesList);

/**
 * @openapi
 * /api/figma/file/{fileKey}:
 *   get:
 *     summary: Figmaファイル詳細取得
 *     description: 指定されたFigmaファイルの詳細情報とドキュメント構造を取得
 *     tags: ['🔌 Figma連携 (Figma)']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-zA-Z0-9]{10,50}$'
 *         description: FigmaファイルKey
 *         example: "abc123xyz"
 *     responses:
 *       200:
 *         description: Figmaファイル詳細取得成功
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
 *                     name:
 *                       type: string
 *                       description: ファイル名
 *                     lastModified:
 *                       type: string
 *                       format: date-time
 *                     thumbnailUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     version:
 *                       type: string
 *                       description: ファイルバージョン
 *                     document:
 *                       type: object
 *                       description: ドキュメントルートノード
 *       400:
 *         description: fileKeyの形式が不正
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: ファイルが見つかりません
 */
router.get('/file/:fileKey', authenticateToken(), figmaController.getFigmaFileDetail);

/**
 * @openapi
 * /api/figma/file/{fileKey}/frames:
 *   get:
 *     summary: Figmaファイルから全Frame抽出
 *     description: 指定されたFigmaファイルからすべてのFRAMEノードを再帰的に抽出
 *     tags: ['🔌 Figma連携 (Figma)']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-zA-Z0-9]{10,50}$'
 *         description: FigmaファイルKey
 *       - in: query
 *         name: maxDepth
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: 最大走査深度
 *       - in: query
 *         name: includeHidden
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 非表示ノードを含めるか
 *     responses:
 *       200:
 *         description: Frame抽出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileKey:
 *                       type: string
 *                     framesCount:
 *                       type: integer
 *                       description: 抽出されたFrame数
 *                     frames:
 *                       type: array
 *                       description: Frameノード配列
 *       400:
 *         description: パラメータ検証エラー
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: ファイルが見つかりません
 */
router.get('/file/:fileKey/frames', authenticateToken(), figmaController.extractFigmaFrames);

/**
 * @openapi
 * /api/figma/file/{fileKey}/node/{nodeId}:
 *   get:
 *     summary: 特定ノード情報取得
 *     description: 指定されたFigmaファイル内の特定ノードの詳細情報を取得
 *     tags: ['🔌 Figma連携 (Figma)']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[a-zA-Z0-9]{10,50}$'
 *         description: FigmaファイルKey
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *         description: "FigmaノードID（例: 1:2）"
 *     responses:
 *       200:
 *         description: ノード情報取得成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Figmaノード情報
 *       400:
 *         description: パラメータ検証エラー
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: ノードが見つかりません
 */
router.get('/file/:fileKey/node/:nodeId', authenticateToken(), figmaController.getFigmaNodeInfo);

/**
 * @openapi
 * /api/figma/import:
 *   post:
 *     summary: Figmaインポート＋解析開始
 *     description: Figmaファイルを取得し、Frame解析を非同期で実行します
 *     tags: ['🔌 Figma連携 (Figma)']
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - fileKey
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 description: プロジェクトID
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *               fileKey:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9]{10,50}$'
 *                 description: FigmaファイルKey
 *                 example: "abc123xyz"
 *               pageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 解析対象ページID配列（オプション）
 *                 example: ["0:1", "0:2"]
 *               analyzeAll:
 *                 type: boolean
 *                 description: 全Frameを解析するか
 *                 default: true
 *     responses:
 *       200:
 *         description: インポート開始成功
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
 *                     jobId:
 *                       type: string
 *                       description: ジョブID
 *                       example: "job_550e8400-e29b-41d4-a716-446655440002"
 *                     status:
 *                       type: string
 *                       enum: [IMPORTING]
 *                       example: "IMPORTING"
 *                     message:
 *                       type: string
 *                       example: "解析を開始しました。完了まで数分かかる場合があります。"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: プロジェクトが見つかりません
 */
router.post('/import', authenticateToken(), figmaController.startFigmaImport);

/**
 * @openapi
 * /api/figma/import/status/{jobId}:
 *   get:
 *     summary: インポート進捗確認
 *     description: 非同期で実行されているFigmaインポート＋解析ジョブの進捗状況を取得
 *     tags: ['🔌 Figma連携 (Figma)']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^job_[a-f0-9-]+$'
 *         description: ジョブID
 *         example: "job_550e8400-e29b-41d4-a716-446655440002"
 *     responses:
 *       200:
 *         description: インポートステータス取得成功
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
 *                     jobId:
 *                       type: string
 *                       example: "job_550e8400-e29b-41d4-a716-446655440002"
 *                     status:
 *                       type: string
 *                       enum: [PENDING, IMPORTING, ANALYZING, COMPLETED, FAILED]
 *                       example: "ANALYZING"
 *                     progress:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                           example: 23
 *                         total:
 *                           type: integer
 *                           example: 45
 *                         percentage:
 *                           type: integer
 *                           example: 51
 *                         currentStep:
 *                           type: string
 *                           example: "Analyzing frames"
 *                     error:
 *                       type: string
 *                       nullable: true
 *                       description: エラーメッセージ（FAILEDの場合）
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: ジョブが見つかりません
 */
router.get('/import/status/:jobId', authenticateToken(), figmaController.getImportStatus);

// エンドポイント一覧をログ出力
logger.info('📌 Figma エンドポイント登録完了:', {
  endpoints: [
    'GET  /api/figma/user',
    'GET  /api/figma/files',
    'GET  /api/figma/file/:fileKey',
    'GET  /api/figma/file/:fileKey/frames',
    'GET  /api/figma/file/:fileKey/node/:nodeId',
    'POST /api/figma/import',
    'GET  /api/figma/import/status/:jobId'
  ]
});

export default router;