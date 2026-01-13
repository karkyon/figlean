// =====================================
// backend/src/routes/auth.routes.ts
// 認証ルート - FIGLEAN完全実装版
// 作成日時: 2026年1月10日 14:05
// 更新日時: 2026年1月10日 19:20 - 完全実装
// 依存関係: express, controllers/authController, middlewares
// 説明: 認証関連エンドポイントの定義とSwagger統合
// =====================================

import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateToken } from '../middlewares/authenticate';
import { authRateLimiter } from '../middlewares/rateLimiter';
import logger from '../utils/logger';

const router = Router();

// =====================================
// Swagger/OpenAPI ドキュメント
// =====================================

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - 🔐 認証 (Authentication)
 *     summary: ユーザー登録
 *     description: |
 *       新規ユーザーを登録します。
 *       - 登録時は自動的にFREEプランが割り当てられます
 *       - パスワードは8文字以上で、大文字・小文字・数字を含む必要があります
 *       - 登録成功時にJWTトークンが発行されます
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: メールアドレス
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: パスワード（8文字以上、大小英数字含む）
 *                 example: SecurePass123
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: ユーザー名
 *                 example: 山田太郎
 *     responses:
 *       201:
 *         description: 登録成功
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
 *                   example: ユーザー登録が完了しました
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         plan:
 *                           type: string
 *                           enum: [FREE, PRO, TEAM]
 *                           example: FREE
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     token:
 *                       type: string
 *                       description: JWTアクセストークン
 *       400:
 *         description: バリデーションエラー
 *       409:
 *         description: メールアドレス重複
 *       429:
 *         description: レート制限超過（5回/15分）
 */
router.post('/register', authRateLimiter, authController.signup);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - 🔐 認証 (Authentication)
 *     summary: ログイン
 *     description: |
 *       メールアドレスとパスワードでログインします。
 *       - ログイン成功時にJWTトークンが発行されます
 *       - トークンの有効期限は24時間です
 *       - 失敗時のみレート制限にカウントされます（5回/15分）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: メールアドレス
 *                 example: junji@figlean.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: パスワード
 *                 example: password123
 *     responses:
 *       200:
 *         description: ログイン成功
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
 *                   example: ログインに成功しました
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                         plan:
 *                           type: string
 *                           enum: [FREE, PRO, TEAM]
 *                         hasFigmaToken:
 *                           type: boolean
 *                           description: Figmaトークンが保存されているか
 *                     token:
 *                       type: string
 *                       description: JWTアクセストークン
 *                     expiresIn:
 *                       type: string
 *                       example: 24h
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証失敗
 *       429:
 *         description: レート制限超過（5回/15分）
 */
router.post('/login', authRateLimiter, authController.login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - 🔐 認証 (Authentication)
 *     summary: 現在のユーザー情報取得
 *     description: |
 *       認証済みユーザーの情報を取得します。
 *       - JWTトークンが必要です
 *       - Figmaトークンの保存状態も確認できます
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ユーザー情報取得成功
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
 *                   example: ユーザー情報を取得しました
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     plan:
 *                       type: string
 *                       enum: [FREE, PRO, TEAM]
 *                     hasFigmaToken:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: 認証エラー
 */
router.get('/me', authenticateToken(), authController.getMe);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - 🔐 認証 (Authentication)
 *     summary: ログアウト
 *     description: |
 *       ユーザーをログアウトします。
 *       - JWTはステートレスのため、クライアント側でトークンを削除してください
 *       - サーバー側では特別な処理は行いません
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ログアウト成功
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
 *                   example: ログアウトに成功しました
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: ログアウトしました
 *       401:
 *         description: 認証エラー
 */
router.post('/logout', authenticateToken(), authController.logout);

/**
 * @openapi
 * /api/auth/figma-token:
 *   post:
 *     tags:
 *       - 🔐 認証 (Authentication)
 *     summary: Figmaトークン保存
 *     description: |
 *       Figmaアクセストークンを暗号化して保存します。
 *       - AES-256-GCM暗号化で安全に保存
 *       - トークンはFigma APIへのアクセスに使用されます
 *       - 既存のトークンは上書きされます
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Figma Personal Access Token
 *                 example: figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *     responses:
 *       200:
 *         description: トークン保存成功
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
 *                   example: Figmaアカウントの接続に成功しました
 *       400:
 *         description: バリデーションエラー
 *       401:
 *         description: 認証エラー
 *   delete:
 *     tags:
 *       - 🔐 認証 (Authentication)
 *     summary: Figmaトークン削除
 *     description: |
 *       保存されているFigmaトークンを削除します。
 *       - Figmaアカウントの接続を解除する際に使用
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: トークン削除成功
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
 *                   example: Figmaアカウントの接続を解除しました
 *       401:
 *         description: 認証エラー
 */
router.post('/figma-token', authenticateToken(), authController.saveFigmaToken);
router.delete('/figma-token', authenticateToken(), authController.deleteFigmaToken);

// =====================================
// ルーティング登録完了ログ
// =====================================

logger.info('✅ 認証ルート初期化完了', {
  endpoints: [
    'POST /api/auth/register',
    'POST /api/auth/login',
    'GET /api/auth/me',
    'POST /api/auth/logout',
    'POST /api/auth/figma-token',
    'DELETE /api/auth/figma-token'
  ]
});

// =====================================
// エクスポート
// =====================================

export default router;