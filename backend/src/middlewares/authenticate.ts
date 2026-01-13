// =====================================
// backend/src/middleware/authenticate.ts
// JWT認証ミドルウェア - FIGLEAN版
// 作成日時: 2026年1月10日 17:50
// 更新日時: 2026年1月10日 18:40 - 完全修正版
// 依存関係: utils/crypto, utils/response, types/auth
// 説明: JWT検証、ユーザー認証、プランチェック
// =====================================

import { Request, Response, NextFunction } from 'express';
import {
  verifyAccessToken,
  validateJWTConfig
} from '../utils/crypto';
import { sendError } from '../utils/response';
import logger from '../utils/logger';
import {
  AuthenticatedUser,
  JWTPayload,
  AuthMiddlewareOptions,
  Plan
} from '../types/auth';

// =====================================
// ユーティリティ関数
// =====================================

/**
 * プラン階層チェック
 * より高いプランは下位の機能も利用可能
 * 
 * FREE < PRO < TEAM
 */
const checkPlanHierarchy = (userPlan: Plan, requiredPlan: Plan): boolean => {
  const planHierarchy: Record<Plan, number> = {
    FREE: 1,
    PRO: 2,
    TEAM: 3
  };

  const userLevel = planHierarchy[userPlan] || 0;
  const requiredLevel = planHierarchy[requiredPlan] || 0;

  return userLevel >= requiredLevel;
};

/**
 * JWTトークン抽出
 * AuthorizationヘッダーからBearerトークンを安全に抽出
 */
const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  const token = parts[1];
  if (!token || token.length < 10) return null; // 最小長チェック

  return token;
};

// =====================================
// メイン認証ミドルウェア
// =====================================

/**
 * JWT認証ミドルウェア
 * 
 * 【機能】
 * - utils/crypto.tsのJWT検証機能を使用
 * - utils/response.tsの統一レスポンス形式
 * - プラン階層チェック機能
 * - セキュリティログ記録
 * 
 * @param options - 認証オプション（省略可能）
 * @returns Express middleware function
 * 
 * @example
 * // 基本的な認証
 * router.get('/projects', authenticateToken(), getProjects);
 * 
 * // プラン制限付き
 * router.post('/html-generator', authenticateToken({ requiredPlan: 'PRO' }), generateHTML);
 * 
 * // オプション認証（ログインユーザーに追加情報を返す場合など）
 * router.get('/public-data', authenticateToken({ optional: true }), getPublicData);
 */
export function authenticateToken(options: AuthMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    logger.middleware('authenticateToken', '開始', { url: req.originalUrl });

    try {
      // JWT設定の事前検証
      if (!validateJWTConfig()) {
        logger.error('JWT設定が無効です');
        sendError(res, 'JWT_CONFIG_ERROR', 'サーバー設定エラー', 500, undefined, req.id);
        return;
      }

      const authHeader = req.headers['authorization'];
      const token = extractToken(authHeader);

      // トークン未提供時の処理
      if (!token) {
        if (options.optional) {
          logger.middleware('authenticateToken', 'トークンなし(オプショナル) - スキップ');
          return next();
        }

        logger.warn('認証トークンが提供されていません', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.originalUrl,
          method: req.method
        });

        sendError(
          res,
          'UNAUTHORIZED',
          'アクセストークンが必要です',
          401,
          undefined,
          req.id
        );
        return;
      }

      // JWT検証
      logger.middleware('authenticateToken', 'JWT検証開始');

      let decoded: JWTPayload;
      try {
        decoded = verifyAccessToken(token);
        logger.middleware('authenticateToken', 'JWT検証成功', { userId: decoded.userId });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';

        logger.warn('JWT検証失敗', {
          error: errorMessage,
          ip: req.ip,
          url: req.originalUrl
        });

        sendError(
          res,
          'UNAUTHORIZED',
          'トークンが無効または期限切れです',
          401,
          undefined,
          req.id
        );
        return;
      }

      // ユーザーのアクティブ状態チェック
      // TODO: DBから最新のisActiveステータスを取得する実装を追加
      // 現時点ではJWTペイロードの情報をそのまま信頼
      
      // プランチェック
      if (options.requiredPlan && !checkPlanHierarchy(decoded.plan, options.requiredPlan)) {
        logger.warn('プラン制限により拒否', {
          userId: decoded.userId,
          userPlan: decoded.plan,
          requiredPlan: options.requiredPlan
        });

        sendError(
          res,
          'FORBIDDEN',
          `この機能は${options.requiredPlan}プラン以上でご利用いただけます`,
          403,
          undefined,
          req.id
        );
        return;
      }

      // 認証済みユーザー情報をリクエストに付与
      const authenticatedUser: AuthenticatedUser = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        plan: decoded.plan,
        hasFigmaToken: false, // TODO: DBから取得
        isActive: true // TODO: DBから取得
      };

      req.user = authenticatedUser;

      logger.middleware('authenticateToken', '認証成功', {
        userId: authenticatedUser.userId,
        plan: authenticatedUser.plan
      });

      next();
    } catch (error) {
      logger.error('認証ミドルウェアエラー', error as Error);
      sendError(
        res,
        'INTERNAL_ERROR',
        'サーバーエラーが発生しました',
        500,
        undefined,
        req.id
      );
    }
  };
}

// =====================================
// プラン制限ヘルパー
// =====================================

/**
 * プラン制限ミドルウェア生成
 * 
 * @param requiredPlan - 必要なプラン
 * @returns Express middleware
 * 
 * @example
 * router.post('/html-generator', requirePlan('PRO'), generateHTML);
 */
export const requirePlan = (requiredPlan: Plan) => {
  return authenticateToken({ requiredPlan });
};

/**
 * PRO以上のプラン要求
 */
export const requirePro = requirePlan('PRO');

/**
 * TEAMプラン要求
 */
export const requireTeam = requirePlan('TEAM');

/**
 * オプション認証（トークンなしでもOK）
 */
export const optionalAuth = authenticateToken({ optional: true });

// =====================================
// カスタムチェックミドルウェア
// =====================================

/**
 * Figmaトークン必須チェック
 * 認証済みユーザーがFigmaトークンを保存しているか確認
 */
export const requireFigmaToken = () => {
  return [
    authenticateToken(),
    (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;

      if (!user) {
        sendError(res, 'UNAUTHORIZED', '認証が必要です', 401, undefined, req.id);
        return;
      }

      if (!user.hasFigmaToken) {
        sendError(
          res,
          'FIGMA_TOKEN_REQUIRED',
          'Figmaアカウントの接続が必要です',
          403,
          undefined,
          req.id
        );
        return;
      }

      next();
    }
  ];
};

/**
 * プロジェクト所有権チェック（将来実装用のプレースホルダー）
 * 
 * @param _getProjectId - リクエストからプロジェクトIDを取得する関数（未使用）
 */
export const requireProjectOwnership = (
  _getProjectId: (req: Request) => string
) => {
  return [
    authenticateToken(),
    async (_req: Request, _res: Response, next: NextFunction) => {
      // 将来の実装用プレースホルダー
      // const user = _req.user;
      // const projectId = _getProjectId(_req);

      // TODO: Prismaでプロジェクトの所有権を確認
      // const project = await prisma.project.findUnique({
      //   where: { id: projectId },
      //   select: { userId: true }
      // });
      //
      // if (!project || project.userId !== user.userId) {
      //   return sendError(_res, 'FORBIDDEN', 'このプロジェクトへのアクセス権限がありません', 403);
      // }

      next();
    }
  ];
};