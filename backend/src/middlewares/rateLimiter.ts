// =====================================
// backend/src/middleware/rateLimiter.ts
// レート制限ミドルウェア - FIGLEAN版
// 作成日時: 2026年1月10日 17:55
// 依存関係: express-rate-limit
// 説明: API・認証エンドポイントのレート制限
// =====================================

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

// =====================================
// 設定
// =====================================

/**
 * 環境変数から設定を取得
 */
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '900000', // 15分
  10
);

const RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || '100',
  10
);

const AUTH_RATE_LIMIT_MAX = parseInt(
  process.env.AUTH_RATE_LIMIT_MAX || '5',
  10
);

// =====================================
// カスタムエラーメッセージ
// =====================================

/**
 * レート制限エラーメッセージを生成
 */
const createRateLimitMessage = (maxRequests: number, windowMinutes: number) => {
  return {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `リクエストが多すぎます。${windowMinutes}分後に再試行してください。`,
      details: {
        maxRequests,
        windowMs: windowMinutes * 60 * 1000,
        retryAfter: windowMinutes
      }
    }
  };
};

/**
 * 認証レート制限エラーメッセージを生成
 */
const createAuthRateLimitMessage = (maxRequests: number, windowMinutes: number) => {
  return {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: `認証試行回数が上限に達しました。セキュリティのため、${windowMinutes}分後に再試行してください。`,
      details: {
        maxRequests,
        windowMs: windowMinutes * 60 * 1000,
        retryAfter: windowMinutes
      }
    }
  };
};

// =====================================
// レート制限ミドルウェア
// =====================================

/**
 * 一般API用レート制限
 * 
 * デフォルト: 100リクエスト/15分
 * 
 * @example
 * app.use('/api', apiRateLimiter);
 */
export const apiRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: createRateLimitMessage(
    RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_MS / 60000
  ),
  standardHeaders: true,  // RateLimit-* ヘッダーを返す
  legacyHeaders: false,   // X-RateLimit-* ヘッダーは返さない
  skipSuccessfulRequests: false, // 成功したリクエストもカウント
  skipFailedRequests: false,     // 失敗したリクエストもカウント
  
  // キー生成（IPアドレスベース）
  keyGenerator: (req: Request): string => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },

  // カスタムハンドラー（ログ出力）
  handler: (req: Request, res: Response) => {
    console.warn('API Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json(
      createRateLimitMessage(
        RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_WINDOW_MS / 60000
      )
    );
  }
});

/**
 * 認証API用レート制限（厳格）
 * 
 * デフォルト: 5リクエスト/15分
 * 成功したリクエストはカウントしない（失敗時のみペナルティ）
 * 
 * @example
 * app.use('/api/auth/login', authRateLimiter);
 * app.use('/api/auth/register', authRateLimiter);
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  message: createAuthRateLimitMessage(
    AUTH_RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS / 60000
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,  // 成功したリクエストはカウントしない
  skipFailedRequests: false,
  
  // キー生成（IPアドレスベース）
  keyGenerator: (req: Request): string => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },

  // カスタムハンドラー（ログ出力）
  handler: (req: Request, res: Response) => {
    console.warn('Auth Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      email: req.body?.email || 'unknown',
      userAgent: req.get('User-Agent')
    });

    res.status(429).json(
      createAuthRateLimitMessage(
        AUTH_RATE_LIMIT_MAX,
        RATE_LIMIT_WINDOW_MS / 60000
      )
    );
  }
});

/**
 * Figma API呼び出し用レート制限（やや緩い）
 * 
 * Figma APIへの過度なリクエストを防ぐ
 * デフォルト: 50リクエスト/15分
 * 
 * @example
 * app.use('/api/figma', figmaApiRateLimiter);
 */
export const figmaApiRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 50,
  message: createRateLimitMessage(50, RATE_LIMIT_WINDOW_MS / 60000),
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request): string => {
    // 認証済みユーザーがいればユーザーIDベース、なければIPベース
    const user = (req as any).user;
    return user?.userId || req.ip || 'unknown';
  },

  handler: (req: Request, res: Response) => {
    console.warn('Figma API Rate limit exceeded', {
      userId: (req as any).user?.userId,
      ip: req.ip,
      url: req.originalUrl
    });

    res.status(429).json(createRateLimitMessage(50, RATE_LIMIT_WINDOW_MS / 60000));
  }
});

/**
 * カスタムレート制限生成
 * 
 * @param maxRequests - ウィンドウ内の最大リクエスト数
 * @param windowMs - ウィンドウ時間（ミリ秒）
 * @param skipSuccessful - 成功したリクエストをスキップするか
 * 
 * @example
 * const customLimiter = createCustomRateLimiter(10, 60000, false);
 * app.use('/api/heavy-operation', customLimiter);
 */
export const createCustomRateLimiter = (
  maxRequests: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
  skipSuccessful: boolean = false
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: createRateLimitMessage(maxRequests, windowMs / 60000),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessful,
    
    keyGenerator: (req: Request): string => {
      return req.ip || req.socket.remoteAddress || 'unknown';
    },

    handler: (req: Request, res: Response) => {
      console.warn('Custom Rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        maxRequests,
        windowMs
      });

      res.status(429).json(createRateLimitMessage(maxRequests, windowMs / 60000));
    }
  });
};

// =====================================
// エクスポート設定情報（デバッグ用）
// =====================================

export const RATE_LIMIT_CONFIG = {
  api: {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
    windowMinutes: RATE_LIMIT_WINDOW_MS / 60000
  },
  auth: {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: AUTH_RATE_LIMIT_MAX,
    windowMinutes: RATE_LIMIT_WINDOW_MS / 60000
  },
  figma: {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: 50,
    windowMinutes: RATE_LIMIT_WINDOW_MS / 60000
  }
} as const;