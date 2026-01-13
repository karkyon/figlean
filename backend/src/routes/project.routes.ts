// =====================================
// backend/src/routes/project.routes.ts
// プロジェクトルーティング - FIGLEAN版
// 作成日時: 2026年1月11日 00:13
// 更新日時: 2026年1月11日 00:13 - 型安全版
// 依存関係: express, controllers/projectController, middlewares/authenticate
// 説明: プロジェクト管理RESTful API定義、Swagger/OpenAPIドキュメント統合
// =====================================

/**
 * Project Routes
 * プロジェクト管理APIのルーティング定義
 */

import { Router } from 'express';
import {
  getProjectsController,
  getProjectController,
  createProjectController,
  updateProjectController,
  deleteProjectController
} from '../controllers/projectController';
import { authenticateToken } from '../middlewares/authenticate';

const router = Router();

/**
 * @openapi
 * /api/projects:
 *   get:
 *     summary: プロジェクト一覧取得
 *     tags: ['📁 プロジェクト管理 (Projects)']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 取得件数
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: オフセット
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, figleanScore, name]
 *           default: createdAt
 *         description: ソートフィールド
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: ソート順
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, FAILED]
 *         description: ステータスフィルター
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: プロジェクト名検索
 *     responses:
 *       200:
 *         description: プロジェクト一覧
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
 *                     projects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ProjectListItem'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', authenticateToken(), getProjectsController as any);

/**
 * @openapi
 * /api/projects/{id}:
 *   get:
 *     summary: プロジェクト詳細取得
 *     tags: ['📁 プロジェクト管理 (Projects)']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: プロジェクトID
 *     responses:
 *       200:
 *         description: プロジェクト詳細
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProjectDetail'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', authenticateToken(), getProjectController as any);

/**
 * @openapi
 * /api/projects:
 *   post:
 *     summary: プロジェクト作成
 *     tags: ['📁 プロジェクト管理 (Projects)']
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - figmaFileKey
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: プロジェクト名
 *                 example: BackENDAPI - AuthAPI Dev
 *               description:
 *                 type: string
 *                 description: プロジェクト説明
 *                 example: 認証API開発プロジェクト
 *               figmaFileKey:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9]{10,50}$'
 *                 description: FigmaファイルKey
 *                 example: acHkYsYaB6UQsBB0jTkWx8MD2G
 *               figmaFileUrl:
 *                 type: string
 *                 format: uri
 *                 description: FigmaファイルURL
 *                 example: https://www.figma.com/file/acHkYsYaB6UQsBB0jTkWx8MD2G/Test-File
 *               figmaFileName:
 *                 type: string
 *                 description: Figmaファイル名
 *                 example: Test File
 *               figmaNodeId:
 *                 type: string
 *                 description: FigmaノードID
 *                 example: 1:2
 *     responses:
 *       201:
 *         description: プロジェクト作成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProjectDetail'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: プラン上限超過
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticateToken(), createProjectController as any);

/**
 * @openapi
 * /api/projects/{id}:
 *   put:
 *     summary: プロジェクト更新
 *     tags: ['📁 プロジェクト管理 (Projects)']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               figmaFileUrl:
 *                 type: string
 *                 format: uri
 *               figmaFileName:
 *                 type: string
 *               figmaNodeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: プロジェクト更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProjectDetail'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:id', authenticateToken(), updateProjectController as any);

/**
 * @openapi
 * /api/projects/{id}:
 *   delete:
 *     summary: プロジェクト削除
 *     tags: ['📁 プロジェクト管理 (Projects)']
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: プロジェクトID
 *     responses:
 *       200:
 *         description: プロジェクト削除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authenticateToken(), deleteProjectController as any);

/**
 * @openapi
 * components:
 *   schemas:
 *     ProjectListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         figmaFileUrl:
 *           type: string
 *           nullable: true
 *         figleanScore:
 *           type: integer
 *           nullable: true
 *         analysisStatus:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, FAILED]
 *         lastAnalyzedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         stats:
 *           type: object
 *           nullable: true
 *           properties:
 *             totalFrames:
 *               type: integer
 *             totalViolations:
 *               type: integer
 *             criticalCount:
 *               type: integer
 *             majorCount:
 *               type: integer
 *             minorCount:
 *               type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ProjectDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         userId:
 *           type: string
 *           format: uuid
 *         description:
 *           type: string
 *           nullable: true
 *         figmaFileKey:
 *           type: string
 *         figmaFileUrl:
 *           type: string
 *           nullable: true
 *         figmaFileName:
 *           type: string
 *           nullable: true
 *         figmaNodeId:
 *           type: string
 *           nullable: true
 *         figleanScore:
 *           type: integer
 *           nullable: true
 *         layoutScore:
 *           type: integer
 *           nullable: true
 *         componentScore:
 *           type: integer
 *           nullable: true
 *         responsiveScore:
 *           type: integer
 *           nullable: true
 *         semanticScore:
 *           type: integer
 *           nullable: true
 *         analysisStatus:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, FAILED]
 *         lastAnalyzedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         analysisCount:
 *           type: integer
 *         htmlGeneratable:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         limit:
 *           type: integer
 *         offset:
 *           type: integer
 *         hasMore:
 *           type: boolean
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             message:
 *               type: string
 *             details:
 *               type: array
 *               items:
 *                 type: string
 *   responses:
 *     Unauthorized:
 *       description: 認証が必要です
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Forbidden:
 *       description: アクセス権限がありません
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     NotFound:
 *       description: リソースが見つかりません
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     BadRequest:
 *       description: リクエストが不正です
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 */

export default router;